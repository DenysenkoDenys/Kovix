using Movie.API.Models.Enums;

namespace Movie.API.Models
{
    public class MovieReaction
    {
        public int Id { get; set; }
        public int MovieId { get; set; }
        public int UserId { get; set; }
        public User? User { get; set; }
        public ReactionType Type { get; set; }
    }
}
