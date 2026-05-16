namespace Movie.API.DTOs
{
    public class LeaderboardUserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public string Role { get; set; } = string.Empty;
        public int ReviewsCount { get; set; }
        public int TestScore { get; set; }
        public string? SelectedAwardIcon { get; set; }
        public string? SelectedAwardName { get; set; }
    }
}