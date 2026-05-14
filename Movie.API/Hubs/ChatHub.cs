using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Movie.API.Data;
using Movie.API.Models;
using Movie.API.Models.Enums;
using System.Security.Claims;

namespace Movie.API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _context;
        private static readonly Dictionary<int, int> Connections = new();
        public ChatHub(ApplicationDbContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                throw new HubException("Unauthorized: User ID not found.");
            }
            return userId;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();

            lock (Connections)
            {
                if (Connections.ContainsKey(userId))
                    Connections[userId]++;
                else
                    Connections[userId] = 1;
            }

            if (Connections[userId] == 1)
            {
                var user = await _context.Users.FindAsync(userId);
                if (user != null)
                {
                    user.IsOnline = true;
                    await _context.SaveChangesAsync();

                    await Clients.All.SendAsync(
                        "UserStatusChanged",
                        userId,
                        true,
                        null
                    );
                }
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetUserId();
            bool isLastConnection = false;

            lock (Connections)
            {
                if (!Connections.ContainsKey(userId))
                    return;

                Connections[userId]--;

                if (Connections[userId] <= 0)
                {
                    Connections.Remove(userId);
                    isLastConnection = true;
                }
            }

            if (isLastConnection)
            {
                var user = await _context.Users.FindAsync(userId);
                if (user != null)
                {
                    user.IsOnline = false;
                    user.LastActive = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    await Clients.All.SendAsync(
                        "UserStatusChanged",
                        userId,
                        false,
                        user.LastActive
                    );
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task GetFriendsStatus()
        {
            var userId = GetUserId();

            var friendIds = await _context.Friendships
                .Where(f => (f.RequesterId == userId || f.ReceiverId == userId)
                            && f.Status == FriendshipStatus.Accepted)
                .Select(f => f.RequesterId == userId ? f.ReceiverId : f.RequesterId)
                .ToListAsync();

            foreach (var fid in friendIds)
            {
                var friend = await _context.Users.FindAsync(fid);
                if (friend != null)
                {
                    await Clients.Caller.SendAsync(
                        "UserStatusChanged",
                        friend.Id,
                        friend.IsOnline,
                        friend.LastActive
                    );
                }
            }
        }

        public async Task SendMessage(string content, int? receiverId, int? replyToMessageId = null)
        {
            var userIdString = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString)) throw new HubException("Unauthorized");
            var senderId = int.Parse(userIdString);

            var sender = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == senderId);
            if (sender == null || sender.IsBlocked) throw new HubException("BLOCK_ERROR: Ваш акаунт заблоковано.");

            string? replyToSender = null;
            string? replyToContent = null;

            if (replyToMessageId.HasValue)
            {
                var parentMsg = await _context.Messages.Include(m => m.Sender).FirstOrDefaultAsync(m => m.Id == replyToMessageId.Value);
                if (parentMsg != null)
                {
                    replyToSender = parentMsg.Sender?.Username;
                    replyToContent = parentMsg.Content;
                }
            }

            var message = new Message
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                Content = content,
                Timestamp = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            if (replyToMessageId.HasValue)
            {
                var reply = new MessageReply
                {
                    MessageId = replyToMessageId.Value,
                    ReplyMessageId = message.Id
                };
                _context.MessageReplies.Add(reply);
                await _context.SaveChangesAsync();

                if (receiverId == null) await Clients.All.SendAsync("ReplyAdded", replyToMessageId.Value);
                else
                {
                    await Clients.User(receiverId.ToString()!).SendAsync("ReplyAdded", replyToMessageId.Value);
                    await Clients.Caller.SendAsync("ReplyAdded", replyToMessageId.Value);
                }
            }

            if (receiverId == null)
            {
                await Clients.All.SendAsync("ReceiveMessage", senderId, sender.Username, content, null, message.Timestamp, message.Id, replyToMessageId, replyToSender, replyToContent);
            }
            else
            {
                await Clients.User(receiverId.ToString()!).SendAsync("ReceiveMessage", senderId, sender.Username, content, receiverId, message.Timestamp, message.Id, replyToMessageId, replyToSender, replyToContent);
                await Clients.Caller.SendAsync("ReceiveMessage", senderId, sender.Username, content, receiverId, message.Timestamp, message.Id, replyToMessageId, replyToSender, replyToContent);
            }
        }

        public async Task EditMessage(int messageId, string newContent)
        {
            var userId = GetUserId();
            var msg = await _context.Messages.FindAsync(messageId);

            if (msg == null || msg.SenderId != userId) return;

            msg.Content = newContent;
            msg.IsEdited = true;
            await _context.SaveChangesAsync();

            await Clients.All.SendAsync("MessageEdited", msg.Id, msg.Content);
        }

        public async Task DeleteMessageForEveryone(int messageId)
        {
            var userId = GetUserId();
            var msg = await _context.Messages.FindAsync(messageId);

            if (msg == null) return;

            bool isAdmin = Context.User!.IsInRole("Admin") || Context.User!.IsInRole("Moderator");

            if (msg.SenderId == userId || isAdmin)
            {
                msg.IsDeleted = true;

                var associatedPins = _context.MessagePins.Where(p => p.MessageId == messageId);
                if (associatedPins.Any())
                {
                    _context.MessagePins.RemoveRange(associatedPins);
                }

                await _context.SaveChangesAsync();
                await Clients.All.SendAsync("MessageDeleted", msg.Id);
            }
        }

        public async Task DeleteMessageForMe(int messageId)
        {
            var userId = GetUserId();

            var exists = await _context.MessageDelete
                .AnyAsync(md => md.MessageId == messageId && md.UserId == userId);

            if (!exists)
            {
                _context.MessageDelete.Add(new MessageDelete
                {
                    MessageId = messageId,
                    UserId = userId
                });
                await _context.SaveChangesAsync();
            }

            await Clients.Caller.SendAsync("MessageDeletedForMe", messageId);
        }
        public async Task AddReaction(int messageId, string reactionEmoji)
        {
            var userId = GetUserId();
            var message = await _context.Messages.FindAsync(messageId);

            if (message == null) return;

            var existingReaction = await _context.MessageReactions
                .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId);

            if (existingReaction != null)
            {
                if (existingReaction.ReactionEmoji == reactionEmoji)
                {
                    _context.MessageReactions.Remove(existingReaction);
                }
                else
                {
                    existingReaction.ReactionEmoji = reactionEmoji;
                }
            }
            else
            {
                var reaction = new MessageReaction
                {
                    MessageId = messageId,
                    UserId = userId,
                    ReactionEmoji = reactionEmoji
                };
                _context.MessageReactions.Add(reaction);
            }

            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(userId);
            if (message.ReceiverId == null)
            {
                await Clients.All.SendAsync("ReactionAdded", messageId, userId, user!.Username, reactionEmoji);
            }
            else
            {
                await Clients.User(message.ReceiverId.ToString()!).SendAsync("ReactionAdded", messageId, userId, user!.Username, reactionEmoji);
                await Clients.Caller.SendAsync("ReactionAdded", messageId, userId, user!.Username, reactionEmoji);
            }
        }

        public async Task PinMessage(int messageId)
        {
            var userId = GetUserId();
            var message = await _context.Messages.FindAsync(messageId);

            if (message == null) return;

            var existingPin = await _context.MessagePins
                .FirstOrDefaultAsync(p => p.MessageId == messageId);

            if (existingPin != null)
            {
                _context.MessagePins.Remove(existingPin);
            }
            else
            {
                var pin = new MessagePin
                {
                    MessageId = messageId,
                    ChatUserId = message.ReceiverId,
                    PinnedBy = userId
                };
                _context.MessagePins.Add(pin);
            }

            await _context.SaveChangesAsync();

            if (message.ReceiverId == null)
            {
                await Clients.All.SendAsync("MessagePinned", messageId);
            }
            else
            {
                await Clients.User(message.ReceiverId.ToString()!).SendAsync("MessagePinned", messageId);
                await Clients.Caller.SendAsync("MessagePinned", messageId);
            }
        }
        public async Task UserTyping(int? receiverId)
        {
            var userId = GetUserId();
            var user = await _context.Users.FindAsync(userId);

            if (receiverId == null)
            {
                await Clients.Others.SendAsync("UserTyping", userId, user!.Username, null);
            }
            else
            {
                await Clients.User(receiverId.ToString()!).SendAsync("UserTyping", userId, user!.Username, userId);
            }
        }

        public async Task UserStoppedTyping(int? receiverId)
        {
            var userId = GetUserId();

            if (receiverId == null)
            {
                await Clients.Others.SendAsync("UserStoppedTyping", userId, null);
            }
            else
            {
                await Clients.User(receiverId.ToString()!).SendAsync("UserStoppedTyping", userId, userId);
            }
        }
    }
}