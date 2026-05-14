using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Movie.API.Data;
using Movie.API.DTOs;
using Movie.API.Models;
using System.Security.Claims;

namespace Movie.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SupportController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SupportController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("tickets")]
        public async Task<IActionResult> CreateTicket([FromBody] CreateSupportTicketDto dto)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized();

            var ticket = new SupportTicket
            {
                UserId = int.Parse(userIdString),
                Subject = dto.Subject,
                Message = dto.Message
            };

            _context.SupportTickets.Add(ticket);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Ваш запит успішно надіслано модераторам." });
        }

        [HttpGet("tickets")]
        [Authorize(Roles = "Admin, Moderator")]
        public async Task<IActionResult> GetTickets()
        {
            var tickets = await _context.SupportTickets
                .Include(t => t.User)
                .OrderBy(t => t.IsResolved)
                .ThenByDescending(t => t.CreatedAt)
                .Select(t => new SupportTicketDto
                {
                    Id = t.Id,
                    UserId = t.UserId,
                    Username = t.User!.Username,
                    Subject = t.Subject,
                    Message = t.Message,
                    IsResolved = t.IsResolved,
                    AdminReply = t.AdminReply,
                    RepliedAt = t.RepliedAt,
                    CreatedAt = t.CreatedAt
                })
                .ToListAsync();

            return Ok(tickets);
        }

        [HttpGet("tickets/my")]
        public async Task<IActionResult> GetMyTickets(string? search, int page = 1, int pageSize = 5)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized();
            var userId = int.Parse(userIdString);

            var query = _context.SupportTickets
                .Where(t => t.UserId == userId)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                query = query.Where(t => t.Subject.ToLower().Contains(s) || t.Message.ToLower().Contains(s));
            }

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            var tickets = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new SupportTicketDto
                {
                    Id = t.Id,
                    Subject = t.Subject,
                    Message = t.Message,
                    IsResolved = t.IsResolved,
                    AdminReply = t.AdminReply,
                    RepliedAt = t.RepliedAt,
                    CreatedAt = t.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                items = tickets,
                totalCount,
                totalPages,
                currentPage = page
            });
        }

        [HttpPut("tickets/{id}/reply")]
        [Authorize(Roles = "Admin, Moderator")]
        public async Task<IActionResult> ReplyToTicket(int id, [FromBody] ReplySupportTicketDto dto)
        {
            var ticket = await _context.SupportTickets.FindAsync(id);
            if (ticket == null) return NotFound("Тікет не знайдено");

            ticket.AdminReply = dto.Reply;
            ticket.RepliedAt = DateTime.UtcNow;
            ticket.IsResolved = true;

            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpPut("tickets/{id}/resolve")]
        [Authorize(Roles = "Admin, Moderator")]
        public async Task<IActionResult> ToggleTicketStatus(int id)
        {
            var ticket = await _context.SupportTickets.FindAsync(id);
            if (ticket == null) return NotFound("Тікет не знайдено");

            ticket.IsResolved = !ticket.IsResolved;
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}