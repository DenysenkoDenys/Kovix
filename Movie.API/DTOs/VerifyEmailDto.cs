using System.ComponentModel.DataAnnotations;

namespace Movie.API.DTOs
{
    public class VerifyEmailDto
    {
        [Required]
        [StringLength(6, MinimumLength = 6)]
        public string Code { get; set; } = string.Empty;
    }
}