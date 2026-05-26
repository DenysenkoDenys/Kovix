using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Movie.API.Data;
using Movie.API.DTOs;
using Movie.API.Models;
using Movie.API.Hubs;
using Microsoft.EntityFrameworkCore;

namespace Movie.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminUserAwardsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<NotificationHub> _notificationHubContext;
        private readonly ILogger<AdminUserAwardsController> _logger;

        public AdminUserAwardsController(ApplicationDbContext context, IHubContext<NotificationHub> notificationHubContext, ILogger<AdminUserAwardsController> logger)
        {
            _context = context;
            _notificationHubContext = notificationHubContext;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> IssueAward([FromBody] UserAwardCreateDto dto)
        {
            var user = await _context.Users.FindAsync(dto.UserId);
            if (user == null) return NotFound("Користувача не знайдено.");

            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest("Назва досягнення обов'язкова.");
            }

            var normalizedName = (dto.Name ?? string.Empty).Trim().ToLower();
            bool alreadyHas = await _context.UserAwards
                .AnyAsync(ua => ua.UserId == dto.UserId && ua.Name != null && ua.Name.ToLower() == normalizedName);

            if (alreadyHas)
            {
                _logger.LogInformation($"🛑 Користувач {dto.UserId} вже має досягнення: {dto.Name}");
                return Conflict("Користувач вже має це досягнення.");
            }

            var award = new UserAward
            {
                UserId = dto.UserId,
                Name = dto.Name!.Trim(),
                Icon = dto.Icon,
                Description = dto.Description
            };

            _context.UserAwards.Add(award);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"🎖️ Видано досягнення: {dto.Name} для користувача {dto.UserId}");

            try
            {
                await _notificationHubContext.Clients.User(dto.UserId.ToString()).SendAsync(
                    "AchievementUnlocked",
                    new
                    {
                        name = dto.Name,
                        icon = dto.Icon,
                        description = dto.Description
                    }
                );
                _logger.LogInformation($"SignalR сповіщення відправлено для {dto.UserId}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Помилка відправки SignalR: {ex.Message}");
            }

            return Ok("Досягнення успішно видано!");
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> EditAward(int id, [FromBody] UserAwardCreateDto dto)
        {
            Console.WriteLine($"Редагування досягнення: ID={id}, Name={dto.Name}");

            var award = await _context.UserAwards.FindAsync(id);
            if (award == null)
            {
                Console.WriteLine($"Досягнення не знайдено: {id}");
                return NotFound("Досягнення не знайдено.");
            }

            award.Name = dto.Name!;
            award.Icon = dto.Icon;
            award.Description = dto.Description;

            await _context.SaveChangesAsync();
            
            Console.WriteLine($"Досягнення оновлено: {id}");
            return Ok("Досягнення оновлено!");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> RemoveAward(int id)
        {
            Console.WriteLine($"Видалення досягнення: ID={id}");

            var award = await _context.UserAwards.FindAsync(id);
            if (award == null)
            {
                Console.WriteLine($"Досягнення не знайдено: {id}");
                return NotFound("Досягнення не знайдено.");
            }

            _context.UserAwards.Remove(award);
            await _context.SaveChangesAsync();
            
            Console.WriteLine($"Досягнення видалено: {id}");
            return Ok("Досягнення видалено.");
        }
    }
}