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
    [Authorize]
    public class WatchlistController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public WatchlistController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("movie/{movieId}")]
        public async Task<ActionResult<WatchlistDto>> GetForMovie(int movieId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var entry = await _context.Watchlists
                .FirstOrDefaultAsync(w => w.MovieId == movieId && w.UserId == userId);

            if (entry == null)
            {
                return Ok(new WatchlistDto { Status = 0, IsFavorite = false });
            }

            return Ok(new WatchlistDto { Status = (int)entry.Status, IsFavorite = entry.IsFavorite });
        }

        [HttpPost("movie/{movieId}")]
        public async Task<IActionResult> Update(int movieId, [FromBody] WatchlistDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var entry = await _context.Watchlists
                .FirstOrDefaultAsync(w => w.MovieId == movieId && w.UserId == userId);

            var newStatus = (WatchStatus)dto.Status;

            if (entry == null)
            {
                entry = new Watchlist
                {
                    UserId = userId,
                    MovieId = movieId,
                    Status = newStatus,
                    IsFavorite = dto.IsFavorite,
                    AddedAt = DateTime.UtcNow
                };
                _context.Watchlists.Add(entry);
            }
            else
            {
                var previousStatus = entry.Status;
                entry.Status = newStatus;
                entry.IsFavorite = dto.IsFavorite;

                if (previousStatus != newStatus)
                {
                    entry.AddedAt = DateTime.UtcNow;
                }
            }

            bool hasWatchlistAward = await _context.UserAwards.AnyAsync(ua => ua.UserId == userId && ua.Name == "Колекціонер");
            if (!hasWatchlistAward)
            {
                _context.UserAwards.Add(new UserAward
                {
                    UserId = userId,
                    Name = "Колекціонер",
                    Icon = "🍿",
                    Description = "За перший доданий фільм до списку переглядів"
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { Status = (int)entry.Status, IsFavorite = entry.IsFavorite });
        }

        [HttpGet("my-list")]
        public async Task<ActionResult> GetMyList()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var list = await _context.Watchlists
                .Where(w => w.UserId == userId && (w.Status != WatchStatus.None || w.IsFavorite))
                .Include(w => w.Movie)
                .Select(w => new
                {
                    w.MovieId,
                    Title = w.Movie != null ? w.Movie.Title : string.Empty,
                    PosterUrl = w.Movie != null ? w.Movie.PosterUrl : null,
                    Status = (int)w.Status, 
                    w.IsFavorite
                })
                .ToListAsync();

            return Ok(list);
        }
    }
}