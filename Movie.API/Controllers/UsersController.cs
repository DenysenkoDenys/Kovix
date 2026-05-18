using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Movie.API.Data;
using Movie.API.DTOs;
using Movie.API.Hubs;
using Movie.API.Models;
using Movie.API.Models.Enums;
using System.Security.Claims;

namespace Movie.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;
        public UsersController(ApplicationDbContext context, IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            return await _context.Users.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound();
            }

            return user;
        }

        [HttpPost]
        public async Task<ActionResult<User>> CreateUser(User user)
        {
            user.CreatedAt = DateTime.UtcNow;
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, User user)
        {
            if (id != user.Id)
            {
                return BadRequest();
            }

            _context.Entry(user).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UserExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("{id}/toggle-block")]
        public async Task<IActionResult> ToggleBlockUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("Користувача не знайдено");

            if (user.Role == "Admin") return BadRequest("Не можна заблокувати адміністратора");

            user.IsBlocked = !user.IsBlocked;
            await _context.SaveChangesAsync();

            return Ok(new { isBlocked = user.IsBlocked, message = user.IsBlocked ? "Користувача заблоковано" : "Користувача розблоковано" });
        }

        [HttpGet("{id}/profile")]
        public async Task<ActionResult<UserProfileDto>> GetUserProfile(int id)
        {
            int? currentUserId = null;
            if (User.Identity.IsAuthenticated)
            {
                var claimId = User.FindFirst(ClaimTypes.NameIdentifier);
                if (claimId != null) currentUserId = int.Parse(claimId.Value);
            }

            var userProfile = await _context.Users
                .AsNoTracking()
                .Where(u => u.Id == id)
                .Select(u => new UserProfileDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    AvatarUrl = u.AvatarUrl,
                    CreatedAt = u.CreatedAt,
                    IsBlocked = u.IsBlocked,
                    IsOnline = u.IsOnline,
                    LastActive = u.LastActive,

                    FollowersCount = u.Followers.Count,
                    FollowingCount = u.Following.Count,

                    IsFollowingByMe = currentUserId.HasValue &&
                                      u.Followers.Any(f => f.ObserverId == currentUserId),

                    Awards = u.Awards.Select(a => new UserAwardDto 
                    {
                        Id = a.Id,
                        Name = a.Name,
                        Icon = a.Icon,
                        Description = a.Description,
                        IssuedAt = a.IssuedAt
                    }).ToList(),

                    SelectedAward = u.SelectedAward != null ? new AwardDto
                    {
                        Id = u.SelectedAward.Id,
                        Name = u.SelectedAward.Name,
                        Icon = u.SelectedAward.Icon
                    } : null
                    ,
                    AppealsCount = u.Appeals.Count,
                    AppealsRemaining = Math.Max(0, 5 - u.Appeals.Count + u.AppealsCredit)
                })
                .FirstOrDefaultAsync();

            if (userProfile == null)
                return NotFound();

            return Ok(userProfile);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("{id}/appeals/adjust")]
        public async Task<IActionResult> AdjustAppeals(int id, [FromBody] Movie.API.DTOs.AdjustAppealsDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.AppealsCredit += dto.Amount;
            await _context.SaveChangesAsync();

            var appealsCount = await _context.Appeals.CountAsync(a => a.UserId == id);
            var appealsRemaining = Math.Max(0, 5 - appealsCount + user.AppealsCredit);

            return Ok(new { appealsCount, appealsRemaining, appealsCredit = user.AppealsCredit });
        }

        private bool UserExists(int id)
        {
            return _context.Users.Any(e => e.Id == id);
        }

        [HttpPost("{id}/follow")]
        [Authorize]
        public async Task<IActionResult> FollowUser(int id)
        {
            var currentUserId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

            if (currentUserId == id) return BadRequest("Не можна підписатися на самого себе");

            var existing = await _context.Set<UserFollow>()
                .FirstOrDefaultAsync(f => f.ObserverId == currentUserId && f.TargetId == id);

            if (existing != null) return BadRequest("Вже підписані");

            var follow = new UserFollow
            {
                ObserverId = currentUserId,
                TargetId = id
            };

            _context.Add(follow);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Підписано успішно" });
        }

        [HttpDelete("{id}/unfollow")]
        [Authorize]
        public async Task<IActionResult> UnfollowUser(int id)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var follow = await _context.Set<UserFollow>()
                .FirstOrDefaultAsync(f => f.ObserverId == currentUserId && f.TargetId == id);

            if (follow == null) return NotFound("Підписку не знайдено");

            _context.Remove(follow);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Відписано успішно" });
        }

        [HttpGet("{id}/followers")]
        public async Task<ActionResult<List<UserShortDto>>> GetFollowers(int id)
        {
            int? currentUserId = null;
            if (User.Identity.IsAuthenticated)
            {
                currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            }

            var followers = await _context.Set<UserFollow>()
                .Where(f => f.TargetId == id)
                .Include(f => f.Observer)
                .Select(f => new UserShortDto
                {
                    Id = f.Observer.Id,
                    Username = f.Observer.Username,
                    AvatarUrl = f.Observer.AvatarUrl,
                    IsFollowing = currentUserId.HasValue &&
                                  _context.Set<UserFollow>().Any(x => x.ObserverId == currentUserId && x.TargetId == f.Observer.Id)
                })
                .ToListAsync();

            return Ok(followers);
        }

        [HttpGet("{id}/following")]
        public async Task<ActionResult<List<UserShortDto>>> GetFollowing(int id)
        {
            int? currentUserId = null;
            if (User.Identity.IsAuthenticated)
            {
                currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            }

            var following = await _context.Set<UserFollow>()
                .Where(f => f.ObserverId == id)
                .Include(f => f.Target)
                .Select(f => new UserShortDto
                {
                    Id = f.Target.Id,
                    Username = f.Target.Username,
                    AvatarUrl = f.Target.AvatarUrl,
                    IsFollowing = currentUserId.HasValue &&
                                  _context.Set<UserFollow>().Any(x => x.ObserverId == currentUserId && x.TargetId == f.Target.Id)
                })
                .ToListAsync();

            return Ok(following);
        }

        [HttpPut("{id}/block")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> BlockUser(int id)
        {
            var userToBlock = await _context.Users.FindAsync(id);
            if (userToBlock == null) return NotFound("Користувача не знайдено.");

            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            userToBlock.IsBlocked = true;

            var notification = new Notification
            {
                UserId = id,
                SenderId = 0,
                Message = "Ваш акаунт було заблоковано адміністратором за порушення правил.",
                Url = "/appeal",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };
            _context.Notifications.Add(notification);

            var activeReports = await _context.Reports
                                             .Where(r => r.ReportedUserId == id && r.Resolution == AppealStatus.Pending)
                                             .ToListAsync();

            foreach (var r in activeReports)
            {
                r.Resolution = AppealStatus.Blocked;
                r.AdminComment = "Закрито автоматично при блокуванні користувача.";
                r.ResolvedByAdminId = adminId;
                r.ResolvedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            if (_hubContext != null)
            {
                await _hubContext.Clients.User(id.ToString()).SendAsync("ReceiveNotification", new
                {
                    id = notification.Id,
                    message = notification.Message,
                    url = notification.Url,
                    createdAt = notification.CreatedAt,
                    isRead = false
                });
            }

            return Ok(new { message = "Користувача заблоковано, скарги перенесено в історію." });
        }

        [HttpGet("blocked-actors")]
        [Authorize]
        public async Task<IActionResult> GetBlockedActors()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var blockedActors = await _context.UserBlockedActors
                .Where(uba => uba.UserId == userId)
                .Include(uba => uba.Actor)
                .Select(uba => new
                {
                    uba.ActorId,
                    uba.Actor.Name,
                    uba.BlockedAt
                })
                .ToListAsync();

            return Ok(blockedActors);
        }

        [HttpPost("block-actor/{actorId}")]
        [Authorize]
        public async Task<IActionResult> BlockActorContent(int actorId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var actorExists = await _context.Actors.AnyAsync(a => a.Id == actorId);
            if (!actorExists) return NotFound("Актора не знайдено.");

            var alreadyBlocked = await _context.UserBlockedActors
                .AnyAsync(uba => uba.UserId == userId && uba.ActorId == actorId);

            if (alreadyBlocked) return BadRequest("Цей актор вже у вашому чорному списку.");

            var blockedActor = new UserBlockedActor
            {
                UserId = userId,
                ActorId = actorId,
                BlockedAt = DateTime.UtcNow
            };

            _context.UserBlockedActors.Add(blockedActor);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Актора додано до чорного списку. Ви більше не побачите фільмів з ним." });
        }

        [HttpDelete("unblock-actor/{actorId}")]
        [Authorize]
        public async Task<IActionResult> UnblockActorContent(int actorId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var blockedActor = await _context.UserBlockedActors
                .FirstOrDefaultAsync(uba => uba.UserId == userId && uba.ActorId == actorId);

            if (blockedActor == null) return NotFound("Цей актор не був заблокований.");

            _context.UserBlockedActors.Remove(blockedActor);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Актора розблоковано." });
        }

        [HttpGet("stats")]
        [Authorize]
        public async Task<IActionResult> GetMyStats()
        {
            try
            {
                var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
                var userId = int.Parse(userIdStr);

                var myWatchlists = await _context.Watchlists
                    .Where(w => w.UserId == userId)
                    .Select(w => new { w.MovieId, w.Status })
                    .ToListAsync();

                var myReviews = await _context.Reviews
                    .Where(r => r.UserId == userId)
                    .Select(r => new { r.MovieId, r.Rating })
                    .ToListAsync();

                var statsData = myWatchlists
                    .GroupJoin(myReviews,
                        w => w.MovieId,
                        r => r.MovieId,
                        (w, revs) => new { w.Status, Rating = revs.Select(r => (double?)r.Rating).FirstOrDefault() })
                    .GroupBy(x => x.Status)
                    .Select(g => new
                    {
                        Status = g.Key,
                        Count = g.Count(),
                        AverageRating = g.Where(x => x.Rating.HasValue).Select(x => x.Rating.Value).DefaultIfEmpty(0).Average()
                    })
                    .ToList();

                var result = new UserMovieStatsDto
                {
                    PlanToWatchCount = statsData.FirstOrDefault(s => s.Status == WatchStatus.PlanToWatch)?.Count ?? 0,
                    PlanToWatchAvg = Math.Round(statsData.FirstOrDefault(s => s.Status == WatchStatus.PlanToWatch)?.AverageRating ?? 0, 1),

                    WatchingCount = statsData.FirstOrDefault(s => s.Status == WatchStatus.Watching)?.Count ?? 0,
                    WatchingAvg = Math.Round(statsData.FirstOrDefault(s => s.Status == WatchStatus.Watching)?.AverageRating ?? 0, 1),

                    CompletedCount = statsData.FirstOrDefault(s => s.Status == WatchStatus.Completed)?.Count ?? 0,
                    CompletedAvg = Math.Round(statsData.FirstOrDefault(s => s.Status == WatchStatus.Completed)?.AverageRating ?? 0, 1),

                    DroppedCount = statsData.FirstOrDefault(s => s.Status == WatchStatus.Dropped)?.Count ?? 0,
                    DroppedAvg = Math.Round(statsData.FirstOrDefault(s => s.Status == WatchStatus.Dropped)?.AverageRating ?? 0, 1)
                };

                result.TotalCount = result.PlanToWatchCount + result.WatchingCount + result.CompletedCount + result.DroppedCount;

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n❌ ПОМИЛКА СТАТИСТИКИ: {ex.Message}");
                if (ex.InnerException != null) Console.WriteLine($"🔍 ДЕТАЛІ: {ex.InnerException.Message}");
                return StatusCode(500, new { message = "Помилка при розрахунку статистики", details = ex.Message });
            }
        }

        [HttpGet("leaderboard")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLeaderboard([FromQuery] string type = "reviews", [FromQuery] int limit = 50)
        {
            try
            {
                var query = _context.Users
                    .AsNoTracking()
                    .Where(u => !u.IsBlocked);

                if (type == "tests")
                {
                    var testLeaders = await query
                        .Where(u => u.TestScore > 0)
                        .OrderByDescending(u => u.TestScore)
                        .Take(limit)
                        .Select(u => new LeaderboardUserDto
                        {
                            Id = u.Id,
                            Username = u.Username,
                            AvatarUrl = u.AvatarUrl,
                            Role = u.Role,
                            ReviewsCount = u.Reviews.Count,
                            TestScore = u.TestScore,
                            SelectedAwardIcon = u.SelectedAward.Icon,
                            SelectedAwardName = u.SelectedAward.Name
                        })
                        .ToListAsync();

                    return Ok(testLeaders);
                }
                else
                {
                    var reviewLeaders = await query
                        .Where(u => u.Reviews.Count > 0)
                        .OrderByDescending(u => u.Reviews.Count)
                        .Take(limit)
                        .Select(u => new LeaderboardUserDto
                        {
                            Id = u.Id,
                            Username = u.Username,
                            AvatarUrl = u.AvatarUrl,
                            Role = u.Role,
                            ReviewsCount = u.Reviews.Count,
                            TestScore = u.TestScore,
                            SelectedAwardIcon = u.SelectedAward.Icon,
                            SelectedAwardName = u.SelectedAward.Name
                        })
                        .ToListAsync();

                    return Ok(reviewLeaders);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n❌ ПОМИЛКА ЛІДЕРБОРДУ: {ex.Message}");
                if (ex.InnerException != null)
                    Console.WriteLine($"🔍 ДЕТАЛІ SQL: {ex.InnerException.Message}");

                return StatusCode(500, new { message = "Помилка сервера", details = ex.Message });
            }
        }
    }
}