using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Movie.API.Data;
using Movie.API.DTOs;
using Movie.API.Hubs;
using Movie.API.Models;
using System.Security.Claims;

namespace Movie.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CriticReviewsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<NotificationHub> _notificationHubContext;

        public CriticReviewsController(ApplicationDbContext context, IHubContext<NotificationHub> notificationHubContext)
        {
            _context = context;
            _notificationHubContext = notificationHubContext;
        }

        [HttpGet("movie/{movieId}")]
        public async Task<IActionResult> GetReviewsForMovie(int movieId)
        {
            var reviews = await _context.CriticReviews
                .Include(cr => cr.User)
                    .ThenInclude(u => u.SelectedAward) 
                .Where(cr => cr.MovieId == movieId)
                .OrderByDescending(cr => cr.CreatedAt)
                .Select(cr => new
                {
                    cr.Id,
                    cr.StoryScore,
                    cr.ActingScore,
                    cr.VisualsScore,
                    cr.AudioScore,
                    cr.OverallScore,
                    cr.Verdict,
                    cr.FullText,
                    cr.CreatedAt,
                    User = new
                    {
                        cr.User.Id,
                        cr.User.Username,
                        cr.User.AvatarUrl,
                        cr.User.Role, 
                        SelectedAward = cr.User.SelectedAward != null ? new 
                        {
                            cr.User.SelectedAward.Id,
                            cr.User.SelectedAward.Name,
                            cr.User.SelectedAward.Icon
                        } : null
                    }
                })
                .ToListAsync();

            return Ok(reviews);
        }

        [HttpPost]
        [Authorize(Roles = "Reviewer,Admin")]
        public async Task<IActionResult> CreateReview([FromBody] CriticReviewCreateDto dto)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            var exists = await _context.CriticReviews
                .AnyAsync(cr => cr.MovieId == dto.MovieId && cr.UserId == userId);

            if (exists) return BadRequest("Ви вже написали професійну рецензію на цей фільм.");

            var review = new CriticReview
            {
                MovieId = dto.MovieId,
                UserId = userId,
                StoryScore = dto.StoryScore,
                ActingScore = dto.ActingScore,
                VisualsScore = dto.VisualsScore,
                AudioScore = dto.AudioScore,
                Verdict = dto.Verdict,
                FullText = dto.FullText,
                CreatedAt = DateTime.UtcNow
            };

            bool hasCriticAward = await _context.UserAwards.AnyAsync(ua => ua.UserId == userId && ua.Name == "Гостре перо");
            bool awardAdded = false;
            
            if (!hasCriticAward)
            {
                _context.UserAwards.Add(new UserAward
                {
                    UserId = userId,
                    Name = "Гостре перо",
                    Icon = "🖋️",
                    Description = "За першу написану професійну рецензію"
                });
                awardAdded = true;
            }

            _context.CriticReviews.Add(review);
            await _context.SaveChangesAsync();
            
            if (awardAdded)
            {
                await _notificationHubContext.Clients.User(userId.ToString()).SendAsync(
                    "AchievementUnlocked",
                    new { name = "Гостре перо", icon = "🖋️", description = "За першу написану професійну рецензію" }
                );
            }

            await _context.Entry(review).Reference(cr => cr.User).LoadAsync();

            return Ok(new
            {
                review.Id,
                review.StoryScore,
                review.ActingScore,
                review.VisualsScore,
                review.AudioScore,
                review.OverallScore,
                review.Verdict,
                review.FullText,
                review.CreatedAt,
                User = new { review.User.Id, review.User.Username, review.User.AvatarUrl }
            });
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteReview(int id)
        {
            var review = await _context.CriticReviews.FindAsync(id);
            if (review == null) return NotFound("Рецензію не знайдено.");

            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role);

            if (userRole != "Admin" && review.UserId.ToString() != userIdString)
            {
                return StatusCode(403, "У вас немає прав для видалення цієї рецензії.");
            }

            _context.CriticReviews.Remove(review);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Рецензію успішно видалено." });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Reviewer,Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] CriticReviewCreateDto dto) 
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var userRole = User.FindFirstValue(ClaimTypes.Role);

            var review = await _context.CriticReviews.FindAsync(id);
            if (review == null) return NotFound("Рецензію не знайдено");

            if (review.UserId != userId)
            {
                return Forbid();
            }

            review.StoryScore = dto.StoryScore;
            review.ActingScore = dto.ActingScore;
            review.VisualsScore = dto.VisualsScore;
            review.AudioScore = dto.AudioScore;
            review.Verdict = dto.Verdict;
            review.FullText = dto.FullText;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Рецензію успішно оновлено!" });
        }
    }
}