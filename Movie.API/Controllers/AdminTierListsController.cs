using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Movie.API.Data;
using Movie.API.DTOs;
using Movie.API.Models.Enums;
using System.Security.Claims;

namespace Movie.API.Controllers
{
    [Route("api/admin/tierlists")]
    [ApiController]
    [Authorize(Roles = "Admin,Moderator")]
    public class AdminTierListsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AdminTierListsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("pending")]
        public async Task<ActionResult<IEnumerable<TierListDetailDto>>> GetPendingTierLists(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var total = await _context.TierLists
                .Where(tl => tl.IsPublic && tl.Status == TierListStatus.Pending)
                .CountAsync();

            var tierLists = await _context.TierLists
                .Where(tl => tl.IsPublic && tl.Status == TierListStatus.Pending)
                .Include(tl => tl.User)
                .Include(tl => tl.Items)
                .ThenInclude(tli => tli.Movie)
                .Include(tl => tl.ModeratedByAdmin)
                .OrderByDescending(tl => tl.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = tierLists.Select(MapToDetailDto).ToList();

            HttpContext.Response.Headers.Add("X-Total-Count", total.ToString());
            return Ok(result);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TierListDetailDto>>> GetAllTierListsForModeration(
            [FromQuery] TierListStatus? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var query = _context.TierLists.Where(tl => tl.IsPublic);

            if (status.HasValue)
            {
                query = query.Where(tl => tl.Status == status.Value);
            }

            var total = await query.CountAsync();

            var tierLists = await query
                .Include(tl => tl.User)
                .Include(tl => tl.Items)
                .ThenInclude(tli => tli.Movie)
                .Include(tl => tl.ModeratedByAdmin)
                .OrderByDescending(tl => tl.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = tierLists.Select(MapToDetailDto).ToList();

            HttpContext.Response.Headers.Add("X-Total-Count", total.ToString());
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TierListDetailDto>> GetTierListById(int id)
        {
            var tierList = await _context.TierLists
                .Include(tl => tl.User)
                .Include(tl => tl.Items)
                .ThenInclude(tli => tli.Movie)
                .Include(tl => tl.ModeratedByAdmin)
                .FirstOrDefaultAsync(tl => tl.Id == id);

            if (tierList == null)
                return NotFound();

            return Ok(MapToDetailDto(tierList));
        }

        [HttpPost("{id}/moderate")]
        public async Task<IActionResult> ModerateTierList(int id, ModerateTierListDto dto)
        {
            var tierList = await _context.TierLists.FindAsync(id);
            if (tierList == null)
                return NotFound();

            if (!tierList.IsPublic)
                return BadRequest("Only public tier lists can be moderated");

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            int? moderatorId = userIdClaim != null ? int.Parse(userIdClaim.Value) : null;

            tierList.Status = dto.Status;
            tierList.AdminComment = dto.AdminComment;
            tierList.ModeratedAt = DateTime.UtcNow;
            tierList.ModeratedByAdminId = moderatorId;

            await _context.SaveChangesAsync();

            return Ok(MapToDetailDto(tierList));
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTierList(int id)
        {
            var tierList = await _context.TierLists.FindAsync(id);
            if (tierList == null)
                return NotFound();

            _context.TierLists.Remove(tierList);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private TierListDetailDto MapToDetailDto(Models.TierList tierList)
        {
            return new TierListDetailDto
            {
                Id = tierList.Id,
                UserId = tierList.UserId,
                Username = tierList.User?.Username ?? "Unknown",
                Title = tierList.Title,
                Description = tierList.Description,
                IsPublic = tierList.IsPublic,
                Status = tierList.Status,
                CreatedAt = tierList.CreatedAt,
                UpdatedAt = tierList.UpdatedAt,
                ModeratedAt = tierList.ModeratedAt,
                AdminComment = tierList.AdminComment,
                Items = tierList.Items.Select(tli => new TierListItemDto
                {
                    Id = tli.Id,
                    MovieId = tli.MovieId,
                    MovieTitle = tli.Movie?.Title ?? "Unknown",
                    MoviePosterUrl = tli.Movie?.PosterUrl,
                    Tier = tli.Tier,
                    Position = tli.Position
                }).ToList()
            };
        }
    }
}