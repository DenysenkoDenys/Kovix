using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Movie.API.Data;
using Movie.API.DTOs;

namespace Movie.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Moderator")]
    public class ModeratorController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ModeratorController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("reports")]
        public async Task<IActionResult> GetReportsForModeration([FromQuery] int? status = null)
        {
            var query = _context.Reports
                .Include(r => r.Sender)
                .Include(r => r.ReportedUser)
                .Include(r => r.Message)
                .AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(r => (int)r.Resolution == status.Value);
            }

            var reports = await query
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    SenderName = r.Sender.Username,
                    r.SenderId,
                    ReportedUserName = r.ReportedUser.Username,
                    r.ReportedUserId,
                    r.Reason,
                    r.MessageId,
                    r.MessageSnapshot,
                    r.CreatedAt,
                    Status = (int)r.Resolution,
                    r.AdminComment,
                    IsResolved = r.Resolution != Movie.API.Models.Enums.AppealStatus.Pending
                })
                .ToListAsync();

            return Ok(reports);
        }

        [HttpDelete("reviews/{reviewId}")]
        public async Task<IActionResult> DeleteCriticReview(int reviewId)
        {
            var review = await _context.CriticReviews.FindAsync(reviewId);
            if (review == null)
                return NotFound("Рецензія не знайдена.");

            _context.CriticReviews.Remove(review);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Рецензія успішно видалена." });
        }

        [HttpDelete("user-reviews/{reviewId}")]
        public async Task<IActionResult> DeleteUserReview(int reviewId)
        {
            var review = await _context.Reviews.FindAsync(reviewId);
            if (review == null)
                return NotFound("Рецензія не знайдена.");

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Рецензія успішно видалена." });
        }

        [HttpPut("users/{userId}/block")]
        public async Task<IActionResult> BlockUserForModeration(int userId, [FromBody] BlockUserDto dto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound("Користувача не знайдено.");

            if (user.Role == "Admin")
                return BadRequest("Не можна блокувати адміністратора.");

            user.IsBlocked = true;
            
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Користувач {user.Username} успішно заблокований." });
        }

        [HttpPut("users/{userId}/unblock")]
        public async Task<IActionResult> UnblockUser(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound("Користувача не знайдено.");

            user.IsBlocked = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Користувач {user.Username} успішно розблокований." });
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsersForModeration([FromQuery] bool? blockedOnly = false)
        {
            var query = _context.Users.AsQueryable();

            if (blockedOnly == true)
            {
                query = query.Where(u => u.IsBlocked);
            }

            var users = await query
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.Email,
                    u.Role,
                    u.IsBlocked,
                    u.AvatarUrl,
                    u.CreatedAt,
                    ReviewsCount = u.Reviews.Count,
                    CriticReviewsCount = u.CriticReviews.Count
                })
                .OrderByDescending(u => u.ReviewsCount + u.CriticReviewsCount)
                .ToListAsync();

            return Ok(users);
        }

        [HttpPut("reports/{reportId}/resolve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ResolveReport(int reportId, [FromBody] ResolveReportDto dto)
        {
            var report = await _context.Reports.FindAsync(reportId);
            if (report == null)
                return NotFound("Звіт не знайдено.");

            report.Resolution = (Models.Enums.AppealStatus)dto.Status;
            report.AdminComment = dto.AdminComment;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Звіт успішно оновлено." });
        }
    }
}