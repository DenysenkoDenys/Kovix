namespace Movie.API.DTOs
{
    public class MessageReplyDto
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public int ReplyMessageId { get; set; }
        public string? ReplyMessageContent { get; set; }
        public string? ReplySenderName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateMessageReplyDto
    {
        public int ReplyMessageId { get; set; }
    }
}