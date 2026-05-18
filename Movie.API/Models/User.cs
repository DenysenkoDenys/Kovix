using System.ComponentModel.DataAnnotations.Schema; 
namespace Movie.API.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? PasswordHash { get; set; }
        public string? AvatarUrl { get; set; }
        public string Role { get; set; } = "User";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsOnline { get; set; } = false;
        public DateTime? LastActive { get; set; }
        public bool IsBlocked { get; set; } = false;

        public ICollection<Review>? Reviews { get; set; }
        public ICollection<Watchlist>? Watchlists { get; set; }

        [InverseProperty("Sender")]
        public ICollection<Report>? ReportsSent { get; set; }

        [InverseProperty("ReportedUser")]
        public ICollection<Report>? ReportsReceived { get; set; }

        public ICollection<Notification>? Notifications { get; set; }
        public string? BlockedGenres { get; set; }
        public string? ExternalProvider { get; set; }
        public string? ExternalId { get; set; }
        public string? PasswordResetToken { get; set; }
        public DateTime? PasswordResetTokenExpires { get; set; }
        public ICollection<UserFollow> Following { get; set; } = new List<UserFollow>();
        public ICollection<UserFollow> Followers { get; set; } = new List<UserFollow>();
        public ICollection<Appeal> Appeals { get; set; } = new List<Appeal>();
        public ICollection<CriticReview> CriticReviews { get; set; } = new List<CriticReview>();
        public List<UserAward> Awards { get; set; } = new List<UserAward>();
        public int? SelectedAwardId { get; set; }
        public UserAward? SelectedAward { get; set; }
        public bool IsPremium { get; set; } = false;
        public DateTime? PremiumUntil { get; set; }
        public bool PremiumReminder7Sent { get; set; } = false;
        public bool PremiumReminder1Sent { get; set; } = false;
        public bool IsEmailVerified { get; set; } = false;
        public string? EmailVerificationCode { get; set; }
        public DateTime? EmailVerificationCodeExpiry { get; set; }
        public int TestScore { get; set; } = 0;
        public int AppealsCredit { get; set; } = 0;
    }
}