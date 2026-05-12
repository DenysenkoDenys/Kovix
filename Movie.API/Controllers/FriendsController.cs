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
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FriendsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<NotificationHub> _hubContext; 

        public FriendsController(ApplicationDbContext context, IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpPost("add/{userId}")]
        public async Task<IActionResult> AddFriend(int userId)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            
            if (currentUserId == userId) return BadRequest("Не можна додати самого себе");

            var currentUser = await _context.Users.FindAsync(currentUserId);
            if (currentUser.IsBlocked) return Forbid("Ви заблоковані і не можете додавати друзів.");

            var hasBlock = await _context.UserBlocks
                .AnyAsync(b => (b.BlockerId == currentUserId && b.BlockedId == userId) ||
                               (b.BlockerId == userId && b.BlockedId == currentUserId));

            if (hasBlock) return BadRequest("Взаємодія з цим користувачем обмежена.");

            var existing = await _context.Friendships
                .FirstOrDefaultAsync(f =>
                    (f.RequesterId == currentUserId && f.ReceiverId == userId) ||
                    (f.RequesterId == userId && f.ReceiverId == currentUserId));

            if (existing != null)
            {
                if (existing.Status == FriendshipStatus.Accepted) return BadRequest("Вже друзі");
                return BadRequest("Запит вже існує");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var friendship = new Friendship
                {
                    RequesterId = currentUserId,
                    ReceiverId = userId,
                    Status = FriendshipStatus.Pending
                };
                _context.Friendships.Add(friendship);

                var notificationMessage = $"Користувач {currentUser.Username} надіслав вам запит у друзі";
                
                var notification = new Notification
                {
                    UserId = userId,
                    SenderId = currentUserId, 
                    Message = notificationMessage,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Notifications.Add(notification);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                await _hubContext.Clients.User(userId.ToString())
                    .SendAsync("ReceiveNotification", new
                    {
                        id = notification.Id,
                        message = notificationMessage,
                        type = "FriendRequest",
                        senderId = currentUserId, 
                        fromUserId = currentUserId, 
                        createdAt = notification.CreatedAt
                    });

                return Ok();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, "Помилка при створенні запиту.");
            }
        }

        [HttpPost("accept/{requesterId}")]
        public async Task<IActionResult> AcceptFriend(int requesterId)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var currentUser = await _context.Users.FindAsync(currentUserId);

            var friendship = await _context.Friendships
                .FirstOrDefaultAsync(f => f.RequesterId == requesterId && f.ReceiverId == currentUserId && f.Status == FriendshipStatus.Pending);

            if (friendship == null) return NotFound("Запит не знайдено");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                friendship.Status = FriendshipStatus.Accepted;
                var oldNotifications = await _context.Notifications
                    .Where(n => n.UserId == currentUserId && 
                               (n.SenderId == requesterId || (n.SenderId == null && n.Message.Contains("запит")))) 
                    .ToListAsync();

                if (oldNotifications.Any())
                {
                    _context.Notifications.RemoveRange(oldNotifications);
                }

                var notificationMessage = $"Користувач {currentUser.Username} прийняв ваш запит у друзі";
                var newNotif = new Notification
                {
                    UserId = requesterId,
                    SenderId = currentUserId,
                    Message = notificationMessage,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Notifications.Add(newNotif);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                await _hubContext.Clients.User(requesterId.ToString())
                    .SendAsync("ReceiveNotification", new
                    {
                        id = newNotif.Id,
                        message = notificationMessage,
                        type = "FriendAccept",
                        senderId = currentUserId,
                        createdAt = newNotif.CreatedAt
                    });

                return Ok();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, "Помилка при прийнятті дружби.");
            }
        }

        [HttpDelete("remove/{friendId}")]
        public async Task<IActionResult> RemoveFriend(int friendId)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var friendship = await _context.Friendships
                .FirstOrDefaultAsync(f =>
                    (f.RequesterId == currentUserId && f.ReceiverId == friendId) ||
                    (f.RequesterId == friendId && f.ReceiverId == currentUserId));

            if (friendship == null) return Ok();

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (friendship.Status == FriendshipStatus.Pending && friendship.ReceiverId == currentUserId)
                {
                    var oldNotifications = await _context.Notifications
                        .Where(n => n.UserId == currentUserId && 
                                   (n.SenderId == friendId || (n.SenderId == null && n.Message.Contains("запит"))))
                        .ToListAsync();

                    if (oldNotifications.Any())
                    {
                        _context.Notifications.RemoveRange(oldNotifications);
                    }
                }

                _context.Friendships.Remove(friendship);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, "Помилка при видаленні друга.");
            }
        }

        [HttpGet("my-friends")]
        public async Task<ActionResult<IEnumerable<FriendDto>>> GetMyFriends()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var friendIds = await _context.Friendships
                .AsNoTracking()
                .Where(f => (f.RequesterId == userId || f.ReceiverId == userId) && f.Status == FriendshipStatus.Accepted)
                .Select(f => f.RequesterId == userId ? f.ReceiverId : f.RequesterId)
                .ToListAsync();

            if (!friendIds.Any()) return Ok(new List<FriendDto>());

            var friendsData = await _context.Users
                .AsNoTracking()
                .Where(u => friendIds.Contains(u.Id))
                .Select(u => new FriendDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    AvatarUrl = u.AvatarUrl,
                    Status = "Friend",
                    IsOnline = u.IsOnline,
                    LastActive = u.LastActive,
                    LastMessage = _context.Messages
                        .Where(m => !m.IsDeleted &&
                                    ((m.SenderId == userId && m.ReceiverId == u.Id) ||
                                     (m.SenderId == u.Id && m.ReceiverId == userId)))
                        .OrderByDescending(m => m.Timestamp)
                        .Select(m => m.Content)
                        .FirstOrDefault(),
                    LastMessageTime = _context.Messages
                        .Where(m => !m.IsDeleted &&
                                    ((m.SenderId == userId && m.ReceiverId == u.Id) ||
                                     (m.SenderId == u.Id && m.ReceiverId == userId)))
                        .OrderByDescending(m => m.Timestamp)
                        .Select(m => m.Timestamp)
                        .FirstOrDefault(),
                    UnreadCount = _context.Messages
                        .Count(m => !m.IsDeleted &&
                                    m.SenderId == u.Id &&
                                    m.ReceiverId == userId &&
                                    !m.IsRead)
                })
                .ToListAsync();

            var sortedFriends = friendsData
                .OrderByDescending(x => x.LastMessageTime ?? DateTime.MinValue)
                .ToList();

            return Ok(sortedFriends);
        }

        [HttpGet("requests")]
        public async Task<ActionResult<IEnumerable<FriendDto>>> GetRequests()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var requests = await _context.Friendships
                .AsNoTracking()
                .Where(f => f.ReceiverId == userId && f.Status == FriendshipStatus.Pending)
                .Include(f => f.Requester)
                .Select(f => new FriendDto
                {
                    Id = f.Requester.Id,
                    Username = f.Requester.Username,
                    AvatarUrl = f.Requester.AvatarUrl,
                    Status = "PendingIncoming"
                })
                .ToListAsync();

            return Ok(requests);
        }

        [HttpGet("status/{userId}")]
        public async Task<IActionResult> CheckStatus(int userId)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var f = await _context.Friendships
                .FirstOrDefaultAsync(f =>
                    (f.RequesterId == currentUserId && f.ReceiverId == userId) ||
                    (f.RequesterId == userId && f.ReceiverId == currentUserId));

            if (f == null) return Ok(new { status = "None" });
            if (f.Status == FriendshipStatus.Accepted) return Ok(new { status = "Friend" });

            return Ok(new { status = f.RequesterId == currentUserId ? "PendingOutgoing" : "PendingIncoming" });
        }
    }
}