namespace Movie.API.DTOs
{
    public class MessageReactionDto
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public int UserId { get; set; }
        public string? UserName { get; set; }
        public string? ReactionEmoji { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AddReactionDto
    {
        public string ReactionEmoji { get; set; } = "❤️";
    }
}