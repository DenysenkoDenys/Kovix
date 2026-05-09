using Microsoft.EntityFrameworkCore;
using Movie.API.DTOs;
using Movie.API.Models;
using Movie.API.Models.Enums;

namespace Movie.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<MovieEntity> Movies { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<ReviewVote> ReviewVotes { get; set; }
        public DbSet<Watchlist> Watchlists { get; set; }
        public DbSet<MovieReaction> MovieReactions { get; set; }
        public DbSet<Friendship> Friendships { get; set; }
        public DbSet<UserBlock> UserBlocks { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<MessageDelete> MessageDelete { get; set; }
        public DbSet<Report> Reports { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<MessageReadStatus> MessageReadStatuses { get; set; }
        public DbSet<WatchHistoryItem> WatchHistory { get; set; }
        public DbSet<Episode> Episodes { get; set; }
        public DbSet<UserEpisodeRating> UserEpisodeRatings { get; set; }
        public DbSet<Actor> Actors { get; set; }    
        public DbSet<MovieActor> MovieActors { get; set; }
        public DbSet<UserBlockedActor> UserBlockedActors { get; set; }
        public DbSet<Appeal> Appeals { get; set; }
        public DbSet<Franchise> Franchises { get; set; }
        public DbSet<Character> Characters { get; set; }
        public DbSet<VoiceActingRole> VoiceActingRoles { get; set; }
        public DbSet<MoviePhoto> MoviePhotos { get; set; }
        public DbSet<NewsItem> News { get; set; }
        public DbSet<CriticReview> CriticReviews { get; set; }
        public DbSet<ReviewerApplication> ReviewerApplications { get; set; }
        public DbSet<UserAward> UserAwards { get; set; }
        public DbSet<MovieAward> MovieAwards { get; set; }
        public DbSet<TierList> TierLists { get; set; }
        public DbSet<TierListItem> TierListItems { get; set; }
        public DbSet<ForumCategory> ForumCategories { get; set; }
        public DbSet<ForumTopic> ForumTopics { get; set; }
        public DbSet<ForumPost> ForumPosts { get; set; }
        public DbSet<TierListReaction> TierListReactions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ReviewVote>()
                .HasOne(v => v.User)
                .WithMany() 
                .HasForeignKey(v => v.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<MovieReaction>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<MovieEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(2000);
                entity.Property(e => e.Genre).HasMaxLength(100);
                entity.Property(e => e.Director).HasMaxLength(100);
            });

            modelBuilder.Entity<Review>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Rating).IsRequired();
                entity.Property(e => e.Comment).HasMaxLength(1000);

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Reviews)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Movie)
                    .WithMany(m => m.Reviews)
                    .HasForeignKey(e => e.MovieId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(100);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasOne(u => u.SelectedAward)
                    .WithMany()
                    .HasForeignKey(u => u.SelectedAwardId)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            modelBuilder.Entity<Watchlist>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Watchlists)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Movie)
                    .WithMany(m => m.Watchlists)
                    .HasForeignKey(e => e.MovieId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Friendship>()
                .HasOne(f => f.Requester)
                .WithMany()
                .HasForeignKey(f => f.RequesterId)
                .OnDelete(DeleteBehavior.Restrict); 

            modelBuilder.Entity<Friendship>()
                .HasOne(f => f.Receiver)
                .WithMany()
                .HasForeignKey(f => f.ReceiverId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<UserBlock>()
                .HasOne(b => b.Blocker)
                .WithMany()
                .HasForeignKey(b => b.BlockerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<UserBlock>()
                .HasOne(b => b.Blocked)
                .WithMany()
                .HasForeignKey(b => b.BlockedId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Message>()
                .HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Message>()
                .HasOne(m => m.Receiver)
                .WithMany()
                .HasForeignKey(m => m.ReceiverId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<MessageDelete>()
               .HasOne(md => md.Message)
               .WithMany(m => m.DeletedFor)
               .HasForeignKey(md => md.MessageId)
               .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MessageDelete>()
                .HasOne(md => md.User)
                .WithMany()
                .HasForeignKey(md => md.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MessageDelete>()
                .HasIndex(md => new { md.MessageId, md.UserId })
                .IsUnique();

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Report>()
                .HasOne(r => r.Sender)
                .WithMany(u => u.ReportsSent) 
                .HasForeignKey(r => r.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Report>()
                .HasOne(r => r.ReportedUser)
                .WithMany(u => u.ReportsReceived)
                .HasForeignKey(r => r.ReportedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<UserFollow>()
                 .HasKey(k => new { k.ObserverId, k.TargetId }); 

            modelBuilder.Entity<UserFollow>()
                .HasOne(u => u.Observer)
                .WithMany(u => u.Following)
                .HasForeignKey(u => u.ObserverId)
                .OnDelete(DeleteBehavior.Restrict); 

            modelBuilder.Entity<UserFollow>()
                .HasOne(u => u.Target)
                .WithMany(u => u.Followers)
                .HasForeignKey(u => u.TargetId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<UserEpisodeRating>()
                .HasIndex(r => new { r.UserId, r.EpisodeId })
                .IsUnique();

            modelBuilder.Entity<Episode>()
                .HasIndex(e => new { e.MovieId, e.SeasonNumber, e.EpisodeNumber })
                .IsUnique();


            modelBuilder.Entity<Episode>()
                .HasOne(e => e.Movie)
                .WithMany(m => m.Episodes)
                .HasForeignKey(e => e.MovieId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserEpisodeRating>()
                .HasOne(r => r.Episode)
                .WithMany(e => e.Ratings)
                .HasForeignKey(r => r.EpisodeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserEpisodeRating>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MovieActor>()
                .HasKey(ma => new { ma.MovieId, ma.ActorId }); 

            modelBuilder.Entity<MovieActor>()
                .HasOne(ma => ma.Movie)
                .WithMany(m => m.MovieActors)
                .HasForeignKey(ma => ma.MovieId);

            modelBuilder.Entity<MovieActor>()
                .HasOne(ma => ma.Actor)
                .WithMany(a => a.MovieActors)
                .HasForeignKey(ma => ma.ActorId);

            modelBuilder.Entity<UserBlockedActor>()
                .HasKey(uba => new { uba.UserId, uba.ActorId });

            modelBuilder.Entity<Appeal>()
                .HasOne(a => a.User)           
                .WithMany()                  
                .HasForeignKey(a => a.UserId)  
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MovieEntity>()
                .HasOne(m => m.Franchise)    
                .WithMany(f => f.Movies)  
                .HasForeignKey(m => m.FranchiseId) 
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<VoiceActingRole>()
                .HasOne(v => v.Movie)
                .WithMany(m => m.VoiceActingRoles)
                .HasForeignKey(v => v.MovieId)
                .OnDelete(DeleteBehavior.Cascade); 

            modelBuilder.Entity<VoiceActingRole>()
                .HasOne(v => v.Actor)
                .WithMany(a => a.VoiceActingRoles)
                .HasForeignKey(v => v.ActorId)
                .OnDelete(DeleteBehavior.Restrict); 

            modelBuilder.Entity<VoiceActingRole>()
                .HasOne(v => v.Character)
                .WithMany(c => c.VoiceActors)
                .HasForeignKey(v => v.CharacterId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<MoviePhoto>()
                .HasOne(mp => mp.Movie)
                .WithMany(m => m.Photos)
                .HasForeignKey(mp => mp.MovieId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CriticReview>()
              .HasOne(cr => cr.Movie)
              .WithMany(m => m.CriticReviews)
              .HasForeignKey(cr => cr.MovieId)
              .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CriticReview>()
                .HasOne(cr => cr.User)
                .WithMany(u => u.CriticReviews)
                .HasForeignKey(cr => cr.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ReviewerApplication>()
                .HasOne(ra => ra.User)
                .WithMany()
                .HasForeignKey(ra => ra.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserAward>()
                .HasOne(ua => ua.User)
                .WithMany(u => u.Awards)
                .HasForeignKey(ua => ua.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserAward>()
                .HasOne(ua => ua.User)
                .WithMany(u => u.Awards)
                .HasForeignKey(ua => ua.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MovieAward>()
                .HasOne(ma => ma.Movie)
                .WithMany(m => m.Awards)
                .HasForeignKey(ma => ma.MovieId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TierList>()
                .HasOne(tl => tl.User)
                .WithMany()
                .HasForeignKey(tl => tl.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TierList>()
                .HasOne(tl => tl.ModeratedByAdmin)
                .WithMany()
                .HasForeignKey(tl => tl.ModeratedByAdminId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<TierListItem>()
                .HasOne(tli => tli.TierList)
                .WithMany(tl => tl.Items)
                .HasForeignKey(tli => tli.TierListId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TierListItem>()
                .HasOne(tli => tli.Movie)
                .WithMany()
                .HasForeignKey(tli => tli.MovieId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ForumTopic>()
                .HasOne(t => t.Category)
                .WithMany(c => c.Topics)
                .HasForeignKey(t => t.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ForumPost>()
                .HasOne(p => p.Topic)
                .WithMany(t => t.Posts)
                .HasForeignKey(p => p.TopicId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ForumTopic>()
                .HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ForumPost>()
                .HasOne(p => p.User)
                .WithMany()
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TierListReaction>()
                .HasIndex(r => new { r.TierListId, r.UserId })
                .IsUnique();

            modelBuilder.Entity<TierListReaction>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.NoAction);


            modelBuilder.Entity<MovieEntity>().HasData(
                new MovieEntity
                {
                    Id = 1,
                    Title = "Inception",
                    Description = "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
                    Year = 2010,
                    Genre = "Sci-Fi",
                    Director = "Christopher Nolan",
                    PosterUrl = "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg",
                    TrailerUrl = "https://www.youtube.com/embed/YoHD9XEInc0",
                    AverageRating = 9.0,
                    TotalReviews = 2,
                    CreatedAt = new DateTime(2023, 5, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new MovieEntity
                {
                    Id = 2,
                    Title = "The Shawshank Redemption",
                    Description = "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
                    Year = 1994,
                    Genre = "Drama",
                    Director = "Frank Darabont",
                    PosterUrl = "https://image.tmdb.org/t/p/original/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
                    TrailerUrl = "https://www.youtube.com/embed/6hB3S9bIaco",
                    AverageRating = 10.0,
                    TotalReviews = 1,
                    CreatedAt = new DateTime(2023, 5, 2, 0, 0, 0, DateTimeKind.Utc)
                },
                new MovieEntity
                {
                    Id = 3,
                    Title = "Dune: Part Two",
                    Description = "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
                    Year = 2024,
                    Genre = "Sci-Fi",
                    Director = "Denis Villeneuve",
                    PosterUrl = "https://image.tmdb.org/t/p/original/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
                    TrailerUrl = "https://www.youtube.com/embed/Way9Dexny3w",
                    AverageRating = 8.0,
                    TotalReviews = 1,
                    CreatedAt = new DateTime(2024, 3, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new MovieEntity
                {
                    Id = 4,
                    Title = "The Dark Knight",
                    Description = "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
                    Year = 2008,
                    Genre = "Action",
                    Director = "Christopher Nolan",
                    PosterUrl = "https://image.tmdb.org/t/p/original/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
                    TrailerUrl = "https://www.youtube.com/embed/EXeTwQWrcwY",
                    AverageRating = 9.5,
                    TotalReviews = 0,
                    CreatedAt = new DateTime(2023, 6, 15, 0, 0, 0, DateTimeKind.Utc)
                }
            );

            modelBuilder.Entity<User>().HasData(
                new User
                {
                    Id = 1,
                    Username = "admin",
                    Email = "admin@gmail.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin"),
                    Role = "Admin",
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            );
        }
    }
}