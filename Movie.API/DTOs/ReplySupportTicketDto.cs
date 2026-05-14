using System.ComponentModel.DataAnnotations;

namespace Movie.API.DTOs
{
    public class ReplySupportTicketDto
    {
        [Required(ErrorMessage = "Відповідь не може бути порожньою")]
        public string Reply { get; set; } = string.Empty;
    }
}