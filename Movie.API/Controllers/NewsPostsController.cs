using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Movie.API.Data;
using Movie.API.Models;

namespace Movie.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NewsPostsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;
        private const long MaxImageBytes = 2 * 1024 * 1024;
        private static readonly HashSet<string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp",
            "image/avif"
        };

        public NewsPostsController(ApplicationDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(
             [FromQuery] string? search = null,
             [FromQuery] int page = 1,
             [FromQuery] int pageSize = 9,
             [FromQuery] bool publishedOnly = false)
        {
            var query = _context.NewsPosts.AsNoTracking().AsQueryable();

            if (publishedOnly)
            {
                query = query.Where(n => n.IsPublished);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(n =>
                    n.Title.ToLower().Contains(searchLower) ||
                    n.Content.ToLower().Contains(searchLower) ||
                    n.ShortDescription.ToLower().Contains(searchLower));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize
            });
        }

        [HttpGet("latest")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLatestNews([FromQuery] int limit = 3)
        {
            var news = await _context.NewsPosts
                .AsNoTracking()
                .Where(n => n.IsPublished)
                .OrderByDescending(n => n.CreatedAt)
                .Take(limit)
                .ToListAsync();

            return Ok(news);
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _context.NewsPosts.FindAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost]
        [Authorize(Roles = "Admin, Moderator")]
        public async Task<IActionResult> Create([FromBody] NewsPost news)
        {
            news.CreatedAt = DateTime.UtcNow;
            _context.NewsPosts.Add(news);
            await _context.SaveChangesAsync();
            return Ok(news);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin, Moderator")]
        public async Task<IActionResult> Update(int id, [FromBody] NewsPost updatedNews)
        {
            var item = await _context.NewsPosts.FindAsync(id);
            if (item == null) return NotFound();

            item.Title = updatedNews.Title;
            item.ShortDescription = updatedNews.ShortDescription;
            item.Content = updatedNews.Content;
            item.ImageUrl = updatedNews.ImageUrl;
            item.IsPublished = updatedNews.IsPublished;

            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin, Moderator")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _context.NewsPosts.FindAsync(id);
            if (item == null) return NotFound();

            _context.NewsPosts.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("upload")]
        [Authorize(Roles = "Admin, Moderator")]
        [RequestSizeLimit(104857600)]
        [RequestFormLimits(MultipartBodyLengthLimit = 104857600)]
        public async Task<IActionResult> UploadImage([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { error = "Файл не вибрано" });

            if (file.Length > MaxImageBytes)
                return BadRequest(new { error = "Фото занадто велике. Максимальний розмір — 2 MB." });

            if (!AllowedImageTypes.Contains(file.ContentType))
                return BadRequest(new { error = "Будь ласка, виберіть зображення" });

            try
            {
                var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var uploadsFolder = Path.Combine(webRoot, "uploads", "news");

                if (!Directory.Exists(uploadsFolder))
                    Directory.CreateDirectory(uploadsFolder);

                var uniqueFileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(fileStream);
                }

                var relativePath = $"/uploads/news/{uniqueFileName}";
                return Ok(new { url = relativePath, filePath = relativePath });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Помилка завантаження файлу", details = ex.Message });
            }
        }
    }
}