namespace Movie.API.DTOs
{
    public class QuizQuestionDto
    {
        public string? Question { get; set; }
        public List<string>? Options { get; set; }
        public int CorrectAnswerIndex { get; set; }
    }
}