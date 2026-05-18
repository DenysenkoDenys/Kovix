using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Movie.API.Data;
using Movie.API.DTOs;
using Movie.API.Models;
using Movie.API.Models.Enums;
using System.Security.Claims;

namespace Movie.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewerApplicationsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ReviewerApplicationsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> SubmitApplication([FromBody] ApplicationCreateDto dto)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("Користувача не знайдено");

            if (user.Role == "Reviewer" || user.Role == "Admin")
                return BadRequest("Ви вже маєте розширені права.");

            if (user.IsBlocked)
                return BadRequest("Заблоковані користувачі не можуть подавати заявки.");

            var existingPending = await _context.ReviewerApplications
                .AnyAsync(a => a.UserId == userId && a.Status == AppealStatus.Pending);

            if (existingPending)
                return BadRequest("Ваша попередня заявка ще розглядається адміністратором.");

            var application = new ReviewerApplication
            {
                UserId = userId,
                MotivationText = dto.MotivationText
            };

            _context.ReviewerApplications.Add(application);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Заявку успішно відправлено!" });
        }

        [HttpGet("pending")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPendingApplications()
        {
            var apps = await _context.ReviewerApplications
                .Include(a => a.User)
                .Where(a => a.Status == AppealStatus.Pending)
                .OrderBy(a => a.CreatedAt)
                .Select(a => new
                {
                    a.Id,
                    a.MotivationText,
                    a.CreatedAt,
                    User = new { a.User.Id, a.User.Username, a.User.Email, a.User.AvatarUrl }
                })
                .ToListAsync();

            return Ok(apps);
        }

        [HttpPost("{id}/approve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ApproveApplication(int id)
        {
            var app = await _context.ReviewerApplications.Include(a => a.User).FirstOrDefaultAsync(a => a.Id == id);
            if (app == null) return NotFound("Заявку не знайдено.");
            if (app.Status != AppealStatus.Pending) return BadRequest("Ця заявка вже оброблена.");

            app.Status = AppealStatus.Approved;

            if (app.User != null)
            {
                app.User.Role = "Reviewer";

                var award = new UserAward
                {
                    UserId = app.User.Id,
                    Name = "Офіційний критик",
                    Icon = "✍️",
                    Description = "Отримав статус професійного рецензента платформи"
                };
                _context.UserAwards.Add(award);
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Заявку схвалено! Користувач отримав роль та нагороду." });
        }

        [HttpPost("{id}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RejectApplication(int id)
        {
            var app = await _context.ReviewerApplications.FindAsync(id);
            if (app == null) return NotFound();

            app.Status = AppealStatus.Rejected;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Заявку відхилено." });
        }
    }
}