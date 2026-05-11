namespace Movie.API.DTOs
{
    public class MovieQuizResultDto
    {
        public int Id { get; set; }
        public int MovieId { get; set; }
        public string? MovieTitle { get; set; }
        public int Rating { get; set; }
        public int CorrectAnswers { get; set; }
        public int TotalQuestions { get; set; }
        public DateTime CompletedAt { get; set; }
    }
}