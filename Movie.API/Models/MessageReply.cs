using System.ComponentModel.DataAnnotations.Schema;

namespace Movie.API.Models
{
    public class MessageReply
    {
        public int Id { get; set; }

        public int MessageId { get; set; } 
        [ForeignKey(nameof(MessageId))]
        public Message? Message { get; set; }

        public int ReplyMessageId { get; set; } 
        [ForeignKey(nameof(ReplyMessageId))]
        public Message? ReplyMessage { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}