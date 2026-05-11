namespace Movie.API.DTOs
{
    public class UserQuizStatsDto
    {
        public int TotalQuizzesCompleted { get; set; }
        public double AverageRating { get; set; }
        public int HighestRating { get; set; }
        public int LowestRating { get; set; }
        public List<MovieQuizResultDto> RecentResults { get; set; } = new();
    }
}
