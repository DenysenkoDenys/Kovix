using System.ComponentModel.DataAnnotations;

namespace Movie.API.DTOs
{
    public class CreateSupportTicketDto
    {
        [Required(ErrorMessage = "Тема обов'язкова")]
        [MaxLength(100)]
        public string Subject { get; set; } = string.Empty;

        [Required(ErrorMessage = "Повідомлення обов'язкове")]
        [MaxLength(1000)]
        public string Message { get; set; } = string.Empty;
    }
}