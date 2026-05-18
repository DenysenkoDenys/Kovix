using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Movie.API.Data;
using Movie.API.DTOs;
using Movie.API.Hubs;
using Movie.API.Models;
using System.Security.Claims;

namespace Movie.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ForumController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly IHubContext<NotificationHub> _notificationHubContext;

        public ForumController(ApplicationDbContext context, IMemoryCache cache, IHubContext<NotificationHub> notificationHubContext)
        {
            _context = context;
            _cache = cache;
            _notificationHubContext = notificationHubContext;
        }

        [HttpGet("categories")]
        public async Task<ActionResult<IEnumerable<ForumCategoryDto>>> GetCategories()
        {
            var categories = await _context.ForumCategories
                .Where(c => c.Status == Models.Enums.TierListStatus.Approved) 
                .OrderBy(c => c.DisplayOrder)
                .Select(c => new ForumCategoryDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Description = c.Description,
                    TopicsCount = c.Topics.Count
                })
                .ToListAsync();

            return Ok(categories);
        }

        [HttpPost("categories")]
        [Authorize]
        public async Task<ActionResult> CreateCategory([FromBody] CreateForumCategoryDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var userRole = User.FindFirstValue(ClaimTypes.Role);

            var status = (userRole == "Admin" || userRole == "Moderator")
                ? Models.Enums.TierListStatus.Approved
                : Models.Enums.TierListStatus.Pending;

            var maxOrder = await _context.ForumCategories.AnyAsync()
                ? await _context.ForumCategories.MaxAsync(c => c.DisplayOrder)
                : 0;

            var category = new ForumCategory
            {
                Name = dto.Name,
                Description = dto.Description,
                ProposedByUserId = userId,
                Status = status,
                DisplayOrder = maxOrder + 1
            };

            _context.ForumCategories.Add(category);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = status == Models.Enums.TierListStatus.Approved
                    ? "Категорію успішно створено!"
                    : "Категорію запропоновано! Вона з'явиться після перевірки модератором.",
                status = status.ToString()
            });
        }

        [HttpGet("admin/pending-categories")]
        [Authorize(Roles = "Admin,Moderator")]
        public async Task<ActionResult> GetPendingCategories()
        {
            var categories = await _context.ForumCategories
                .Where(c => c.Status == Models.Enums.TierListStatus.Pending)
                .Include(c => c.ProposedByUser)
                .Select(c => new {
                    c.Id,
                    c.Name,
                    c.Description,
                    ProposedBy = c.ProposedByUser != null ? c.ProposedByUser.Username : "Невідомо"
                })
                .ToListAsync();

            return Ok(categories);
        }

        [HttpPost("admin/categories/{id}/moderate")]
        [Authorize(Roles = "Admin,Moderator")]
        public async Task<ActionResult> ModerateCategory(int id, [FromQuery] bool approve)
        {
            var category = await _context.ForumCategories.FindAsync(id);
            if (category == null) return NotFound("Категорію не знайдено");

            if (approve)
            {
                category.Status = Models.Enums.TierListStatus.Approved;
                await _context.SaveChangesAsync();
                return Ok(new { message = "Категорію схвалено та опубліковано." });
            }
            else
            {
                _context.ForumCategories.Remove(category); 
                await _context.SaveChangesAsync();
                return Ok(new { message = "Запропоновану категорію відхилено (видалено)." });
            }
        }

        [HttpGet("categories/{categoryId}/topics")]
        public async Task<ActionResult<IEnumerable<ForumTopicPreviewDto>>> GetTopicsByCategory(int categoryId)
        {
            var topics = await _context.ForumTopics
                .Where(t => t.CategoryId == categoryId)
                .Include(t => t.User)
                .Include(t => t.Posts)
                .OrderByDescending(t => t.IsPinned) 
                .ThenByDescending(t => t.UpdatedAt)
                .Select(t => new ForumTopicPreviewDto
                {
                    Id = t.Id,
                    Title = t.Title,
                    AuthorName = t.User!.Username,
                    CreatedAt = t.CreatedAt,
                    RepliesCount = t.Posts.Count - 1, 
                    ViewsCount = t.ViewsCount,
                    IsPinned = t.IsPinned,
                    IsClosed = t.IsClosed
                })
                .ToListAsync();

            return Ok(topics);
        }

        [HttpGet("topics/{topicId}")]
        public async Task<ActionResult> GetTopic(int topicId)
        {
            var topic = await _context.ForumTopics
                .Include(t => t.Category)
                .FirstOrDefaultAsync(t => t.Id == topicId);

            if (topic == null) return NotFound("Тему не знайдено");

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var viewerId = userId ?? HttpContext.Connection.RemoteIpAddress?.ToString() ?? "guest";

            var cacheKey = $"view_topic_{topicId}_{viewerId}";

            if (!_cache.TryGetValue(cacheKey, out _))
            {
                topic.ViewsCount++;
                await _context.SaveChangesAsync();

                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromHours(1));

                _cache.Set(cacheKey, true, cacheOptions);
            }

            var posts = await _context.ForumPosts
                .Where(p => p.TopicId == topicId)
                .Include(p => p.User)
                .OrderBy(p => p.CreatedAt)
                .Select(p => new ForumPostDto
                {
                    Id = p.Id,
                    Content = p.Content,
                    AuthorId = p.UserId,
                    AuthorName = p.User!.Username,
                    AuthorAvatarUrl = p.User.AvatarUrl,
                    AuthorRole = p.User.Role,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt,
                    ParentPostId = p.ParentPostId
                })
                .ToListAsync();

            return Ok(new
            {
                topic.Id,
                topic.Title,
                topic.IsClosed,
                AuthorId = topic.UserId,
                CategoryName = topic.Category?.Name,
                Posts = posts
            });
        }

        [HttpPost("topics")]
        [Authorize]
        public async Task<ActionResult> CreateTopic([FromBody] CreateTopicDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var category = await _context.ForumCategories.FindAsync(dto.CategoryId);
            if (category == null) return NotFound("Категорію не знайдено");

            var topic = new ForumTopic
            {
                CategoryId = dto.CategoryId,
                UserId = userId,
                Title = dto.Title,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.ForumTopics.Add(topic);
            await _context.SaveChangesAsync(); 

            var firstPost = new ForumPost
            {
                TopicId = topic.Id,
                UserId = userId,
                Content = dto.FirstPostContent,
                CreatedAt = DateTime.UtcNow
            };

            _context.ForumPosts.Add(firstPost);
            await _context.SaveChangesAsync();

            return Ok(new { topicId = topic.Id, message = "Тему створено!" });
        }

        [HttpPost("topics/{id}/posts")]
        [Authorize]
        public async Task<ActionResult> CreatePost(int id, [FromBody] CreatePostDto dto)
        {
            var topic = await _context.ForumTopics.FindAsync(id);
            if (topic == null) return NotFound("Тему не знайдено");
            if (topic.IsClosed) return BadRequest("Тема закрита для обговорення");

            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var post = new ForumPost
            {
                TopicId = id,
                UserId = userId,
                Content = dto.Content,
                ParentPostId = dto.ParentPostId 
            };

            _context.ForumPosts.Add(post);
            topic.UpdatedAt = DateTime.UtcNow;

            bool hasForumPostAward = await _context.UserAwards.AnyAsync(ua => ua.UserId == userId && ua.Name == "Голос на форумі");
            bool awardAdded = false;
            
            if (!hasForumPostAward)
            {
                _context.UserAwards.Add(new UserAward
                {
                    UserId = userId,
                    Name = "Голос на форумі",
                    Icon = "💬",
                    Description = "За перший коментар на форумі"
                });
                awardAdded = true;
            }

            await _context.SaveChangesAsync();
            
            if (awardAdded)
            {
                await _notificationHubContext.Clients.User(userId.ToString()).SendAsync(
                    "AchievementUnlocked",
                    new { name = "Голос на форумі", icon = "💬", description = "За перший коментар на форумі" }
                );
            }

            return Ok(new { message = "Відповідь додано!" });
        }

        [HttpDelete("categories/{id}")]
        [Authorize(Roles = "Admin,Moderator")]
        public async Task<ActionResult> DeleteCategory(int id)
        {
            var category = await _context.ForumCategories.FindAsync(id);
            if (category == null) return NotFound("Категорію не знайдено");

            _context.ForumCategories.Remove(category);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Категорію успішно видалено" });
        }

        [HttpDelete("topics/{id}")]
        [Authorize(Roles = "Admin,Moderator")]
        public async Task<ActionResult> DeleteTopic(int id)
        {
            var topic = await _context.ForumTopics.FindAsync(id);
            if (topic == null) return NotFound("Тему не знайдено");

            _context.ForumTopics.Remove(topic);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Тему успішно видалено" });
        }

        [HttpDelete("posts/{id}")]
        [Authorize(Roles = "Admin,Moderator")]
        public async Task<ActionResult> DeletePost(int id)
        {
            var post = await _context.ForumPosts
                .Include(p => p.Replies)
                .FirstOrDefaultAsync(p => p.Id == id);
            
            if (post == null) return NotFound("Повідомлення не знайдено");

            async Task DeletePostAndChildren(ForumPost p)
            {
                var children = await _context.ForumPosts
                    .Include(child => child.Replies)
                    .Where(child => child.ParentPostId == p.Id)
                    .ToListAsync();

                foreach (var child in children)
                {
                    await DeletePostAndChildren(child);
                }

                _context.ForumPosts.Remove(p);
            }

            await DeletePostAndChildren(post);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Повідомлення та всі відповіді успішно видалено" });
        }

        [HttpPut("categories/{id}")]
        [Authorize(Roles = "Admin,Moderator")]
        public async Task<ActionResult> EditCategory(int id, [FromBody] EditCategoryDto dto)
        {
            var category = await _context.ForumCategories.FindAsync(id);
            if (category == null) return NotFound("Категорію не знайдено");

            category.Name = dto.Name;
            category.Description = dto.Description;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Категорію оновлено" });
        }

        [HttpPut("topics/{id}")]
        [Authorize]
        public async Task<ActionResult> EditTopicTitle(int id, [FromBody] EditTopicDto dto)
        {
            var topic = await _context.ForumTopics.FindAsync(id);
            if (topic == null) return NotFound("Тему не знайдено");

            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            if (topic.UserId != userId && !User.IsInRole("Admin") && !User.IsInRole("Moderator"))
                return Forbid("Ви не можете редагувати чужу тему");

            topic.Title = dto.Title;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Назву теми оновлено" });
        }

        [HttpPut("posts/{id}")]
        [Authorize]
        public async Task<ActionResult> EditPost(int id, [FromBody] EditPostDto dto)
        {
            var post = await _context.ForumPosts.FindAsync(id);
            if (post == null) return NotFound("Повідомлення не знайдено");

            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            if (post.UserId != userId && !User.IsInRole("Admin") && !User.IsInRole("Moderator"))
                return Forbid("Ви не можете редагувати чуже повідомлення");

            post.Content = dto.Content;
            post.UpdatedAt = DateTime.UtcNow; 
            await _context.SaveChangesAsync();

            return Ok(new { message = "Повідомлення оновлено" });
        }
    }
}