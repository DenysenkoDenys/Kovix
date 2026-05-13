namespace Movie.API.DTOs
{
    public class PinMessageDto
    {
        public bool PinForEveryone { get; set; } = true;
        public bool PinForSelf { get; set; } = false;
    }
}