namespace Movie.API.DTOs
{
    public class UserProfileDto
    {
        public int Id { get; set; }
        public string? Username { get; set; }
        public string? AvatarUrl { get; set; }
        public bool IsBlocked { get; set; }
        public bool IsOnline { get; set; }
        public DateTime? LastActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int FollowersCount { get; set; }
        public int FollowingCount { get; set; }
        public bool IsFollowingByMe { get; set; }
        public List<UserAwardDto> Awards { get; set; } = new List<UserAwardDto>();
        public AwardDto? SelectedAward { get; set; }
        public int AppealsCount { get; set; }
        public int AppealsRemaining { get; set; }
    }
}