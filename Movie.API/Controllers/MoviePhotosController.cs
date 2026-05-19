using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Movie.API.Data;
using Movie.API.Models;

namespace Movie.API.Controllers
{
    [Route("api/movies/{movieId}/photos")]
    [ApiController]
    public class MoviePhotosController : ControllerBase
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

        public MoviePhotosController(ApplicationDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpGet]
        public async Task<IActionResult> GetPhotos(int movieId)
        {
            var photos = await _context.MoviePhotos
                .Where(p => p.MovieId == movieId)
                .Select(p => new { p.Id, p.ImageUrl })
                .ToListAsync();
            return Ok(photos);
        }

        [HttpPost("url")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AddPhotoUrl(int movieId, [FromBody] string imageUrl)
        {
            var photo = new MoviePhoto { MovieId = movieId, ImageUrl = imageUrl };
            _context.MoviePhotos.Add(photo);
            await _context.SaveChangesAsync();
            return Ok(photo);
        }

        [HttpPost("upload")]
        [Authorize(Roles = "Admin")]
        [RequestSizeLimit(104857600)] 
        [RequestFormLimits(MultipartBodyLengthLimit = 104857600)] 
        public async Task<IActionResult> UploadPhotos(int movieId, [FromForm] List<IFormFile> files)
        {
            if (files == null || files.Count == 0) return BadRequest("Файли не вибрано.");

            var uploadedPhotos = new List<MoviePhoto>();

            var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadsFolder = Path.Combine(webRoot, "uploads", "movies", movieId.ToString(), "photos");

            if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

            foreach (var file in files)
            {
                if (file.Length == 0)
                    continue;

                if (file.Length > MaxImageBytes)
                    return BadRequest("Фото занадто велике. Максимальний розмір — 2 MB.");

                if (!AllowedImageTypes.Contains(file.ContentType))
                    return BadRequest("Будь ласка, виберіть зображення.");

                if (file.Length > 0)
                {
                    var uniqueFileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
                    var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                    using (var fileStream = new FileStream(filePath, FileMode.Create))
                    {
                        await file.CopyToAsync(fileStream);
                    }

                    var photo = new MoviePhoto
                    {
                        MovieId = movieId,
                        ImageUrl = $"/uploads/movies/{movieId}/photos/{uniqueFileName}"
                    };
                    _context.MoviePhotos.Add(photo);
                    uploadedPhotos.Add(photo);
                }
            }

            await _context.SaveChangesAsync();
            return Ok(uploadedPhotos);
        }

        [HttpDelete("{photoId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeletePhoto(int movieId, int photoId)
        {
            var photo = await _context.MoviePhotos.FirstOrDefaultAsync(p => p.Id == photoId && p.MovieId == movieId);
            if (photo == null) return NotFound();

            if (!photo.ImageUrl.StartsWith("http"))
            {
                var filePath = Path.Combine(_env.WebRootPath, photo.ImageUrl.TrimStart('/'));
                if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);
            }

            _context.MoviePhotos.Remove(photo);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}