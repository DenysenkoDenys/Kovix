using System.ComponentModel.DataAnnotations.Schema;

namespace Movie.API.Models
{
    public class MessagePin
    {
        public int Id { get; set; }

        public int MessageId { get; set; }
        [ForeignKey(nameof(MessageId))]
        public Message? Message { get; set; }

        public int? ChatUserId { get; set; } 
        [ForeignKey(nameof(ChatUserId))]
        public User? ChatUser { get; set; }

        public int PinnedBy { get; set; }
        [ForeignKey(nameof(PinnedBy))]
        public User? PinnedByUser { get; set; }
        public bool IsPinForSelf { get; set; } = false;

        public DateTime PinnedAt { get; set; } = DateTime.UtcNow;

        public int PinOrder { get; set; } = 0; 
    }
}