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
    public class ChatController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ChatController(ApplicationDbContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        }

        [HttpGet("general")]
        public async Task<IActionResult> GetGeneralHistory()
        {
            var userId = GetUserId();

            var msgs = await _context.Messages
                .AsNoTracking()
                .Where(m => m.ReceiverId == null && !m.IsDeleted)
                .OrderByDescending(m => m.Timestamp)
                .Take(50)
                .OrderBy(m => m.Timestamp)
                .Select(m => new
                {
                    m.Id,
                    m.Content,
                    m.Timestamp,
                    m.SenderId,
                    SenderName = m.Sender.Username,
                    m.IsEdited,
                    IsRead = _context.MessageReadStatuses.Any(r => r.MessageId == m.Id && r.UserId == userId && r.IsRead),

                    ReplyTo = _context.MessageReplies
                        .Where(r => r.ReplyMessageId == m.Id)
                        .Select(r => new {
                            id = r.MessageId,
                            senderName = r.Message!.Sender!.Username,
                            content = r.Message.Content
                        })
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(msgs);
        }

        [HttpPost("general/read")]
        public async Task<IActionResult> MarkGeneralAsRead()
        {
            var userId = GetUserId();

            var unread = await _context.Messages
                .Where(m => m.ReceiverId == null && !m.IsDeleted)
                .Where(m => !_context.MessageReadStatuses.Any(r => r.MessageId == m.Id && r.UserId == userId && r.IsRead))
                .ToListAsync();

            foreach (var msg in unread)
            {
                _context.MessageReadStatuses.Add(new MessageReadStatus
                {
                    MessageId = msg.Id,
                    UserId = userId,
                    IsRead = true
                });
            }

            await _context.SaveChangesAsync();

            return Ok();
        }


        [HttpGet("private/{userId}")]
        public async Task<IActionResult> GetPrivateHistory(int userId)
        {
            var currentUserId = GetUserId();
            var me = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId);
            if (me.IsBlocked) return StatusCode(403, "Ваш акаунт заблоковано");

            var msgs = await _context.Messages
                .AsNoTracking()
                .Where(m =>
                    !m.IsDeleted &&
                    !m.DeletedFor.Any(d => d.UserId == currentUserId) &&
                    (
                        (m.SenderId == currentUserId && m.ReceiverId == userId) ||
                        (m.SenderId == userId && m.ReceiverId == currentUserId)
                    )
                )
                .Include(m => m.Sender)
                .OrderByDescending(m => m.Timestamp)
                .Take(50)
                .OrderBy(m => m.Timestamp)
                .Select(m => new
                {
                    m.Id,
                    m.Content,
                    m.Timestamp,
                    m.SenderId,
                    SenderName = m.Sender.Username,
                    ReceiverId = m.ReceiverId,
                    m.IsEdited,

                    ReplyTo = _context.MessageReplies
                        .Where(r => r.ReplyMessageId == m.Id)
                        .Select(r => new {
                            id = r.MessageId,
                            senderName = r.Message!.Sender!.Username,
                            content = r.Message.Content
                        })
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(msgs);
        }

        [HttpDelete("messages/{id}/me")]
        public async Task<IActionResult> DeleteForMe(int id)
        {
            var userId = GetUserId();

            var messageExists = await _context.Messages
                .AnyAsync(m => m.Id == id);

            if (!messageExists)
                return NotFound();

            var exists = await _context.MessageDelete
                .AnyAsync(x => x.MessageId == id && x.UserId == userId);

            if (!exists)
            {
                _context.MessageDelete.Add(new MessageDelete
                {
                    MessageId = id,
                    UserId = userId
                });

                await _context.SaveChangesAsync();
            }

            return Ok();
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("messages/{id}")]
        public async Task<IActionResult> DeleteMessage(int id)
        {
            var msg = await _context.Messages.FindAsync(id);
            if (msg == null) return NotFound();

            msg.IsDeleted = true;

            var associatedPins = _context.MessagePins.Where(p => p.MessageId == id);
            _context.MessagePins.RemoveRange(associatedPins);

            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpPut("messages/{id}")]
        public async Task<IActionResult> EditMessage(int id, [FromBody] EditMessageDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetUserId();

            var msg = await _context.Messages.FindAsync(id);
            if (msg == null) return NotFound();

            if (msg.SenderId != userId)
                return Forbid();

            msg.Content = dto.Content.Trim();
            msg.IsEdited = true;

            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpPost("messages/read/{senderId}")]
        public async Task<IActionResult> MarkMessagesAsRead(int senderId)
        {
            var myId = GetUserId();

            var unreadMessages = await _context.Messages
                .Where(m => m.SenderId == senderId && m.ReceiverId == myId && !m.IsRead)
                .ToListAsync();

            if (unreadMessages.Any())
            {
                foreach (var msg in unreadMessages)
                {
                    msg.IsRead = true;
                }

                await _context.SaveChangesAsync();
            }

            return Ok(new { count = unreadMessages.Count });
        }

        [HttpPost("messages/{messageId}/reactions")]
        public async Task<IActionResult> AddReaction(int messageId, [FromBody] AddReactionDto dto)
        {
            var userId = GetUserId();
            var message = await _context.Messages.FindAsync(messageId);

            if (message == null)
                return NotFound("Повідомлення не знайдено");

            var existingReaction = await _context.MessageReactions
                .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId);

            if (existingReaction != null)
            {
                if (existingReaction.ReactionEmoji == dto.ReactionEmoji)
                {
                    _context.MessageReactions.Remove(existingReaction);
                }
                else
                {
                    existingReaction.ReactionEmoji = dto.ReactionEmoji;
                }
            }
            else
            {
                var reaction = new MessageReaction
                {
                    MessageId = messageId,
                    UserId = userId,
                    ReactionEmoji = dto.ReactionEmoji
                };
                _context.MessageReactions.Add(reaction);
            }

            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpGet("messages/{messageId}/reactions")]
        public async Task<IActionResult> GetMessageReactions(int messageId)
        {
            var reactions = await _context.MessageReactions
                .Where(r => r.MessageId == messageId)
                .Include(r => r.User)
                .Select(r => new MessageReactionDto
                {
                    Id = r.Id,
                    MessageId = r.MessageId,
                    UserId = r.UserId,
                    UserName = r.User!.Username,
                    ReactionEmoji = r.ReactionEmoji,
                    CreatedAt = r.CreatedAt
                })
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(reactions);
        }

        [HttpPost("messages/{messageId}/pin")]
        public async Task<IActionResult> PinMessage(int messageId, [FromBody] PinMessageDto dto)
        {
            var userId = GetUserId();
            var message = await _context.Messages.FindAsync(messageId);

            if (message == null)
                return NotFound("Повідомлення не знайдено");

            var isGeneralChat = message.ReceiverId == null;
            int? chatUserForPin = null;

            if (isGeneralChat)
            {
                if (!dto.PinForSelf)
                {
                    var user = await _context.Users.FindAsync(userId);
                    if (user?.Role != "Admin" && user?.Role != "Moderator")
                        return Forbid("Тільки адміни та модератори можуть закріплювати для всіх у глобальному чаті");
                }
            }
            else
            {
                var otherUserId = message.SenderId == userId ? message.ReceiverId!.Value : message.SenderId;
                chatUserForPin = Math.Min(userId, otherUserId);
            }

            MessagePin? existingPin;

            if (!dto.PinForSelf)
            {
                existingPin = await _context.MessagePins
                    .FirstOrDefaultAsync(p => p.MessageId == messageId &&
                                              p.ChatUserId == chatUserForPin &&
                                              !p.IsPinForSelf);
            }
            else
            {
                existingPin = await _context.MessagePins
                    .FirstOrDefaultAsync(p => p.MessageId == messageId &&
                                              p.ChatUserId == chatUserForPin &&
                                              p.IsPinForSelf &&
                                              p.PinnedBy == userId);
            }

            if (existingPin != null)
            {
                _context.MessagePins.Remove(existingPin);
            }
            else
            {
                var pin = new MessagePin
                {
                    MessageId = messageId,
                    ChatUserId = chatUserForPin,
                    IsPinForSelf = dto.PinForSelf,
                    PinnedBy = userId
                };
                _context.MessagePins.Add(pin);
            }

            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpGet("pins/general")]
        public async Task<IActionResult> GetGeneralPinnedMessages()
        {
            var currentUserId = GetUserId();

            var pins = await _context.MessagePins
                .Where(p => p.ChatUserId == null)
                .Where(p => !p.IsPinForSelf || p.PinnedBy == currentUserId)
                .Where(p => !p.Message!.IsDeleted)
                .Include(p => p.Message)
                .Include(p => p.Message!.Sender)
                .Include(p => p.PinnedByUser)
                .OrderBy(p => p.PinOrder)
                .Select(p => new MessagePinDto
                {
                    Id = p.Id,
                    MessageId = p.MessageId,
                    MessageContent = p.Message!.Content,
                    SenderName = p.Message!.Sender!.Username,
                    PinnedByName = p.PinnedByUser!.Username,
                    PinnedAt = p.PinnedAt,
                    PinOrder = p.PinOrder,
                    IsPinForSelf = p.IsPinForSelf
                })
                .ToListAsync();

            return Ok(pins);
        }

        [HttpGet("pins/private/{userId}")]
        public async Task<IActionResult> GetPrivatePinnedMessages(int userId)
        {
            var currentUserId = GetUserId();

            var chatKey = Math.Min(currentUserId, userId);

            var pins = await _context.MessagePins
                .Where(p => p.ChatUserId == chatKey &&
                           (!p.IsPinForSelf || p.PinnedBy == currentUserId))
                .Where(p => !p.Message!.IsDeleted)
                .Include(p => p.Message)
                .Include(p => p.Message!.Sender)
                .Include(p => p.PinnedByUser)
                .OrderBy(p => p.PinOrder)
                .Select(p => new MessagePinDto
                {
                    Id = p.Id,
                    MessageId = p.MessageId,
                    MessageContent = p.Message!.Content,
                    SenderName = p.Message!.Sender!.Username,
                    PinnedByName = p.PinnedByUser!.Username,
                    PinnedAt = p.PinnedAt,
                    PinOrder = p.PinOrder,
                    IsPinForSelf = p.IsPinForSelf
                })
                .ToListAsync();

            return Ok(pins);
        }

        [HttpPost("messages/{messageId}/reply")]
        public async Task<IActionResult> ReplyToMessage(int messageId, [FromBody] CreateMessageReplyDto dto)
        {
            var message = await _context.Messages.FindAsync(messageId);
            var replyMessage = await _context.Messages.FindAsync(dto.ReplyMessageId);

            if (message == null || replyMessage == null)
                return NotFound("Повідомлення не знайдено");

            var reply = new MessageReply
            {
                MessageId = messageId,
                ReplyMessageId = dto.ReplyMessageId
            };

            _context.MessageReplies.Add(reply);
            await _context.SaveChangesAsync();

            return Ok(reply);
        }

        [HttpGet("messages/{messageId}/replies")]
        public async Task<IActionResult> GetMessageReplies(int messageId)
        {
            var replies = await _context.MessageReplies
                .Where(r => r.MessageId == messageId)
                .Include(r => r.ReplyMessage)
                .Include(r => r.ReplyMessage!.Sender)
                .Select(r => new MessageReplyDto
                {
                    Id = r.Id,
                    MessageId = r.MessageId,
                    ReplyMessageId = r.ReplyMessageId,
                    ReplyMessageContent = r.ReplyMessage!.Content,
                    ReplySenderName = r.ReplyMessage!.Sender!.Username,
                    CreatedAt = r.CreatedAt
                })
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(replies);
        }
    }
}