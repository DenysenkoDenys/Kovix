using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Movie.API.Models
{
    public class MovieQuizResult
    {
        [Key]
        public int Id { get; set; }

        [ForeignKey(nameof(User))]
        public int UserId { get; set; }
        public User? User { get; set; }

        [ForeignKey(nameof(Movie))]
        public int MovieId { get; set; }
        public MovieEntity? Movie { get; set; }

        [Range(0, 100)]
        public int Rating { get; set; }

        public int CorrectAnswers { get; set; }
        public int TotalQuestions { get; set; }

        public DateTime CompletedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}