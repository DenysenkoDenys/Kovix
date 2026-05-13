namespace Movie.API.DTOs
{
    public class MessagePinDto
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public string? MessageContent { get; set; }
        public string? SenderName { get; set; }
        public string? PinnedByName { get; set; }
        public DateTime PinnedAt { get; set; }
        public int PinOrder { get; set; }
        public bool IsPinForSelf { get; set; } = false;
    }

    public class CreateMessagePinDto
    {
        public int PinOrder { get; set; } = 0;
    }
}