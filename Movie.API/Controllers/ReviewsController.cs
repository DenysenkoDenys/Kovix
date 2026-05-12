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
    public class ReviewsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<NotificationHub> _notificationHubContext;

        public ReviewsController(ApplicationDbContext context, IHubContext<NotificationHub> notificationHubContext)
        {
            _context = context;
            _notificationHubContext = notificationHubContext;
        }

        [HttpGet("movie/{movieId}")]
        public async Task<ActionResult<IEnumerable<ReviewWithVotesDto>>> GetByMovie(int movieId)
        {
            int? currentUserId = null;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null)
            {
                currentUserId = int.Parse(userIdClaim.Value);
            }

            var reviews = await _context.Reviews
                .Where(r => r.MovieId == movieId)
                .Include(r => r.User)
                .Include(r => r.Votes)
                .Include(r => r.User).ThenInclude(u => u.SelectedAward)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            var result = reviews.Select(r => new ReviewWithVotesDto
            {
                Id = r.Id,
                Comment = r.Comment,
                Rating = r.Rating,
                CreatedAt = r.CreatedAt,
                MovieId = r.MovieId,
                UserId = r.UserId,
                UserName = r.User?.Username ?? "Unknown",
                UserAvatar = r.User?.AvatarUrl ?? "",
                Role = r.User?.Role,
                SelectedAward = r.User?.SelectedAward != null ? new AwardDto
                {
                    Id = r.User.SelectedAward.Id,
                    Name = r.User.SelectedAward.Name,
                    Icon = r.User.SelectedAward.Icon
                } : null,

                LikesCount = r.Votes?.Count(v => v.IsLike) ?? 0,
                DislikesCount = r.Votes?.Count(v => !v.IsLike) ?? 0,

                CurrentUserVote = currentUserId.HasValue
                    ? (r.Votes?.FirstOrDefault(v => v.UserId == currentUserId.Value)?.IsLike == true ? 1
                       : r.Votes?.FirstOrDefault(v => v.UserId == currentUserId.Value)?.IsLike == false ? -1
                       : 0)
                    : 0
            });

            return Ok(result);
        }

        [HttpPost("{id}/vote")]
        [Authorize]
        public async Task<IActionResult> Vote(int id, [FromQuery] bool isLike)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();

            var existingVote = await _context.ReviewVotes
                .FirstOrDefaultAsync(v => v.ReviewId == id && v.UserId == userId);

            if (existingVote != null)
            {
                if (existingVote.IsLike == isLike)
                {
                    _context.ReviewVotes.Remove(existingVote);
                }
                else
                {
                    existingVote.IsLike = isLike;
                }
            }
            else
            {
                var newVote = new ReviewVote
                {
                    ReviewId = id,
                    UserId = userId,
                    IsLike = isLike
                };
                _context.ReviewVotes.Add(newVote);
            }

            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Review>> Create(CreateReviewDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim.Value);

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return Unauthorized();

            if (user.IsBlocked)
            {
                return StatusCode(403, "Ваш акаунт заблоковано. Ви не можете залишати відгуки.");
            }

            var movie = await _context.Movies
                .Include(m => m.Reviews)
                .FirstOrDefaultAsync(m => m.Id == dto.MovieId);

            if (movie == null) return NotFound("Фільм не знайдено");

            bool alreadyReviewed = await _context.Reviews
                .AnyAsync(r => r.MovieId == dto.MovieId && r.UserId == userId);

            if (alreadyReviewed)
            {
                return BadRequest("Ви вже залишили відгук до цього фільму.");
            }

            var review = new Review
            {
                MovieId = dto.MovieId,
                UserId = userId,
                Rating = dto.Rating,
                Comment = dto.Comment,
                CreatedAt = DateTime.UtcNow
            };

            bool hasReviewAward = await _context.UserAwards.AnyAsync(ua => ua.UserId == userId && ua.Name == "Перше слово");
            bool awardAdded = false;
            
            if (!hasReviewAward)
            {
                _context.UserAwards.Add(new UserAward
                {
                    UserId = userId,
                    Name = "Перше слово",
                    Icon = "✍️",
                    Description = "За перший написанний коментар на сайті"
                });
                awardAdded = true;
            }

            _context.Reviews.Add(review);

            movie.Reviews ??= new List<Review>();
            movie.Reviews.Add(review);

            movie.TotalReviews = movie.Reviews.Count;
            movie.AverageRating = movie.Reviews.Any() ? movie.Reviews.Average(r => r.Rating) : 0;

            await _context.SaveChangesAsync();
            
            if (awardAdded)
            {
                await _notificationHubContext.Clients.User(userId.ToString()).SendAsync(
                    "AchievementUnlocked",
                    new { name = "Перше слово", icon = "✍️", description = "За перший написанний коментар на сайті" }
                );
            }

            await _context.Entry(review).Reference(r => r.User).LoadAsync();

            return CreatedAtAction(nameof(GetByMovie), new { movieId = review.MovieId }, review);
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();

            if (userRole != "Admin" && review.UserId != userId)
            {
                return Forbid();
            }

            var movieId = review.MovieId;

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();

            var movie = await _context.Movies
                .Include(m => m.Reviews)
                .FirstAsync(m => m.Id == movieId);

            if (movie.Reviews != null && movie.Reviews.Any())
            {
                movie.TotalReviews = movie.Reviews.Count;
                movie.AverageRating = movie.Reviews.Average(r => r.Rating);
            }
            else
            {
                movie.TotalReviews = 0;
                movie.AverageRating = 0;
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(int id, UpdateReviewDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();

            if (review.UserId != userId)
            {
                return Forbid();
            }

            review.Rating = dto.Rating;
            review.Comment = dto.Comment;

            await _context.SaveChangesAsync();

            var movie = await _context.Movies
                .Include(m => m.Reviews)
                .FirstOrDefaultAsync(m => m.Id == review.MovieId);

            if (movie != null && movie.Reviews != null)
            {
                movie.AverageRating = movie.Reviews.Average(r => r.Rating);
                await _context.SaveChangesAsync();
            }

            return NoContent();
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<ReviewWithVotesDto>>> GetByUser(int userId)
        {
            int? currentViewerId = null;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null) currentViewerId = int.Parse(userIdClaim.Value);

            var reviews = await _context.Reviews
                .Where(r => r.UserId == userId)
                .Include(r => r.User)
                    .ThenInclude(u => u.SelectedAward) 
                .Include(r => r.Movie)
                .Include(r => r.Votes)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            var result = reviews.Select(r => new ReviewWithVotesDto
            {
                Id = r.Id,
                Comment = r.Comment,
                Rating = r.Rating,
                CreatedAt = r.CreatedAt,
                UserName = r.User.Username,
                UserAvatar = r.User.AvatarUrl,
                MovieId = r.MovieId,
                MovieTitle = r.Movie.Title,
                MoviePosterUrl = r.Movie.PosterUrl,
                UserId = r.UserId,

                Role = r.User.Role,
                SelectedAward = r.User.SelectedAward != null ? new AwardDto
                {
                    Id = r.User.SelectedAward.Id,
                    Name = r.User.SelectedAward.Name,
                    Icon = r.User.SelectedAward.Icon
                } : null,

                LikesCount = r.Votes.Count(v => v.IsLike),
                DislikesCount = r.Votes.Count(v => !v.IsLike),
                CurrentUserVote = currentViewerId.HasValue
                    ? (r.Votes.FirstOrDefault(v => v.UserId == currentViewerId)?.IsLike == true ? 1
                       : r.Votes.FirstOrDefault(v => v.UserId == currentViewerId)?.IsLike == false ? -1 : 0)
                    : 0
            });

            return Ok(result);
        }
    }
}
