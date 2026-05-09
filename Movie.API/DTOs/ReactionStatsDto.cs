namespace Movie.API.DTOs
{
    public class ReactionStatsDto
    {
        public int Likes { get; set; }
        public int Dislikes { get; set; }
        public int Fire { get; set; }
        public string? UserReaction { get; set; } 
    }
}
