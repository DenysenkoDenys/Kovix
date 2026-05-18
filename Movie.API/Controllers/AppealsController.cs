using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Movie.API.Data;
using Movie.API.DTOs;
using Movie.API.Models;
using Movie.API.Models.Enums;
using System.Security.Claims;
using Microsoft.AspNetCore.SignalR; 
using Movie.API.Hubs; 

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class AppealsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<NotificationHub> _hubContext; 

    public AppealsController(ApplicationDbContext context, IHubContext<NotificationHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpPost]
    public async Task<IActionResult> CreateAppeal([FromBody] string content)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var userId = int.Parse(userIdStr);
        var user = await _context.Users.FindAsync(userId);

        if (user == null) return NotFound();

        if (!user.IsBlocked)
        {
            return BadRequest("Ваш акаунт не заблокований.");
        }

        var totalAppealsCount = await _context.Appeals.CountAsync(a => a.UserId == userId);
        if (totalAppealsCount >= 5)
        {
            return BadRequest("Ви вичерпали ліміт апеляцій (максимум 5). Зверніться до адміністрації іншим способом.");
        }

        var username = User.Identity?.Name ?? "Користувач";

        var existing = await _context.Appeals.AnyAsync(a => a.UserId == userId && a.Status == AppealStatus.Pending);
        if (existing) return BadRequest("Ви вже подали апеляцію. Очікуйте рішення.");

        var appeal = new Appeal { UserId = userId, Content = content };
        _context.Appeals.Add(appeal);
        await _context.SaveChangesAsync();

        var admins = await _context.Users.Where(u => u.Role == "Admin").ToListAsync();
        foreach (var admin in admins)
        {
            var notification = new Notification
            {
                UserId = admin.Id,
                SenderId = userId,
                Message = $"Нова апеляція від @{username}",
                Url = "/admin/appeals",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.User(admin.Id.ToString()).SendAsync("ReceiveNotification", new
            {
                id = notification.Id,
                message = notification.Message,
                url = notification.Url,
                createdAt = notification.CreatedAt,
                isRead = false
            });
        }
        await _context.SaveChangesAsync();

        return Ok(new { message = "Апеляцію відправлено." });
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllAppeals()
    {
        var appeals = await _context.Appeals
            .Include(a => a.User)
            .ThenInclude(u => u.SelectedAward)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new {
                a.Id,
                a.Content,
                Status = (int)a.Status, 
                a.AdminComment,
                a.CreatedAt,
                user = a.User == null ? null : new
                {
                    id = a.User.Id,
                    username = a.User.Username,
                    role = a.User.Role,
                    selectedAward = a.User.SelectedAward == null ? null : new
                    {
                        id = a.User.SelectedAward.Id,
                        name = a.User.SelectedAward.Name,
                        icon = a.User.SelectedAward.Icon
                    }
                }
            })
            .ToListAsync();

        return Ok(appeals);
    }

    [HttpGet("my-appeal")]
    public async Task<IActionResult> GetMyAppeal()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _context.Users.FindAsync(userId);

        if (user == null) return NotFound();

        if (!user.IsBlocked)
            return Ok(null); 
        

        var appeal = await _context.Appeals
            .Where(a => a.UserId == userId && a.Status != AppealStatus.Approved)
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync();

        if (appeal == null) return Ok(null);

        return Ok(new {
            id = appeal.Id,
            content = appeal.Content,
            status = (int)appeal.Status,
            adminComment = appeal.AdminComment,
            createdAt = appeal.CreatedAt
        });
    }

    [HttpPut("{id}/process")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ProcessAppeal(int id, [FromBody] AppealProcessDto dto)
    {
        var appeal = await _context.Appeals
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appeal == null) return NotFound();

        appeal.Status = dto.Status;
        appeal.AdminComment = dto.AdminComment;

        if (dto.Status == AppealStatus.Approved && appeal.User != null)
        {
            appeal.User.IsBlocked = false; 

            _context.Notifications.Add(new Notification
            {
                UserId = appeal.UserId,
                Message = "Вашу апеляцію схвалено! Акаунт розблоковано.",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            });

            await _hubContext.Clients.User(appeal.UserId.ToString()).SendAsync("AppealStatusUpdated", new
            {
                appealId = appeal.Id,
                newStatus = (int)AppealStatus.Approved,
                adminComment = appeal.AdminComment
            });

            await _hubContext.Clients.User(appeal.UserId.ToString()).SendAsync("UserUpdated");
        }

        await _context.SaveChangesAsync();
        return Ok();
    }
}