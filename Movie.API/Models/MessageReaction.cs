using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;

namespace Movie.API.Models
{
    [Index(nameof(MessageId), nameof(UserId), IsUnique = false)]
    public class MessageReaction
    {
        public int Id { get; set; }

        public int MessageId { get; set; }

        [ForeignKey(nameof(MessageId))]
        public Message? Message { get; set; }

        public int UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }

        public string ReactionEmoji { get; set; } = "❤️";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}