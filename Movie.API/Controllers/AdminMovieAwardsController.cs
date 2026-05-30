using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Movie.API.Data;
using Movie.API.DTOs;
using Movie.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Movie.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminMovieAwardsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AdminMovieAwardsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> IssueAward([FromBody] MovieAwardCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var movie = await _context.Movies
                .Include(m => m.Awards)
                .FirstOrDefaultAsync(m => m.Id == dto.MovieId);

            if (movie == null)
                return NotFound("Фільм не знайдено");

            var award = new MovieAward
            {
                Name = dto.Name,
                Icon = dto.Icon,
                MovieId = dto.MovieId,
                IssuedAt = DateTime.UtcNow
            };

            _context.Add(award);
            await _context.SaveChangesAsync();

            return Ok(new AwardDto 
            { 
                Id = award.Id, 
                Name = award.Name, 
                Icon = award.Icon 
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> RemoveAward(int id)
        {
            var award = await _context.Set<MovieAward>().FirstOrDefaultAsync(a => a.Id == id);

            if (award == null)
                return NotFound("Нагорода не знайдена");

            _context.Set<MovieAward>().Remove(award);
            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> EditAward(int id, [FromBody] MovieAwardCreateDto dto)
        {
            var award = await _context.MovieAwards.FindAsync(id);
            if (award == null) return NotFound("Нагороду не знайдено.");

            award.Name = dto.Name;
            award.Icon = dto.Icon;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Нагороду успішно оновлено!" });
        }
    }
}