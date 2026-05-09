using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Movie.API.Models
{
    public class TierListReaction
    {
        [Key]
        public int Id { get; set; }

        public int TierListId { get; set; }
        [ForeignKey("TierListId")]
        public TierList? TierList { get; set; }

        public int UserId { get; set; }
        [ForeignKey("UserId")]
        public User? User { get; set; }

        [Required]
        public string? ReactionType { get; set; } 
    }
}