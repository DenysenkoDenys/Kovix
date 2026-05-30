using GTranslate.Translators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Movie.API.Data;
using Movie.API.DTOs;
using Movie.API.Hubs;
using Movie.API.Models;
using Movie.API.Models.Enums;
using Movie.API.Models.TMdb;
using Movie.API.Services;
using System.Security.Claims;

namespace Movie.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MoviesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly IHubContext<NotificationHub> _notificationHubContext;
        private readonly TmdbService _tmdbService;
        public MoviesController(ApplicationDbContext context, IWebHostEnvironment env,
            IHubContext<NotificationHub> notificationHubContext, TmdbService tmdbService)
        {
            _context = context;
            _env = env;
            _notificationHubContext = notificationHubContext;
            _tmdbService = tmdbService;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<MovieEntity>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? genres,
        [FromQuery] string? sort,
        [FromQuery] int? year,
        [FromQuery] string? awards,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 8)
        {
            var query = _context.Movies
                .Include(m => m.MovieActors)
                .Include(m => m.Awards)
                .AsQueryable();

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null)
            {
                var userId = int.Parse(userIdClaim.Value);
                var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);

                if (user != null && !string.IsNullOrEmpty(user.BlockedGenres))
                {
                    var blockedList = user.BlockedGenres.Split(',', StringSplitOptions.RemoveEmptyEntries);

                    foreach (var blocked in blockedList)
                    {
                        var b = blocked.Trim();
                        query = query.Where(m => m.Genre == null || !m.Genre.ToLower().Contains(b));
                    }
                }
                var blockedActorIds = await _context.UserBlockedActors
                .Where(uba => uba.UserId == userId)
                .Select(uba => uba.ActorId)
                .ToListAsync();

                if (blockedActorIds.Any())
                {
                    query = query.Where(m => !m.MovieActors.Any(ma => blockedActorIds.Contains(ma.ActorId)));
                }
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(m => m.Title.ToLower().Contains(searchLower));
            }

            if (year.HasValue)
            {
                query = query.Where(m => m.Year == year.Value);
            }

            if (!string.IsNullOrWhiteSpace(genres))
            {
                var genreList = genres.ToLower().Split(',', StringSplitOptions.RemoveEmptyEntries);
                foreach (var genre in genreList)
                {
                    var g = genre.Trim();
                    query = query.Where(m => m.Genre != null && m.Genre.ToLower().Contains(g));
                }
            }

            if (!string.IsNullOrWhiteSpace(awards))
            {
                var awardIds = awards.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(a => int.TryParse(a.Trim(), out var id) ? (int?)id : null)
                    .Where(a => a.HasValue)
                    .Select(a => a.Value)
                    .ToList();

                if (awardIds.Any())
                {
                    query = query.Where(m => m.Awards.Any(ma => awardIds.Contains(ma.Id)));
                }
            }

            switch (sort)
            {
                case "dateAsc":
                    query = query.OrderBy(m => m.CreatedAt);
                    break;
                case "ratingDesc":
                    query = query.OrderByDescending(m => m.AverageRating + (double)m.TotalReviews / (m.TotalReviews + 10));
                    break;
                case "viewsDesc":
                    query = query.OrderByDescending(m => m.ViewsCount);
                    break;
                case "yearDesc":
                    query = query.OrderByDescending(m => m.Year);
                    break;
                case "titleAsc":
                    query = query.OrderBy(m => m.Title);
                    break;
                case "dateDesc":
                default:
                    query = query.OrderByDescending(m => m.CreatedAt);
                    break;
            }

            int totalCount = await query.CountAsync();

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new PagedResult<MovieEntity>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = page,
                PageSize = pageSize
            };

            return Ok(result);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<MovieDetailDto>> GetById(int id)
        {
            int? currentUserId = null;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null) currentUserId = int.Parse(userIdClaim.Value);

            var movie = await _context.Movies
                .Include(m => m.Reviews)
                .Include(m => m.Episodes)
                .Include(m => m.MovieActors)
                    .ThenInclude(ma => ma.Actor)
                .Include(m => m.Franchise)
                    .ThenInclude(f => f.Movies)
                .Include(m => m.Awards)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (movie == null) return NotFound();

            var reactions = await _context.MovieReactions
                .Where(r => r.MovieId == id)
                .ToListAsync();

            var myReactions = currentUserId.HasValue
                ? reactions.Where(r => r.UserId == currentUserId.Value).ToList()
                : new List<MovieReaction>();

            var episodeDtos = new List<EpisodeDto>();
            if (movie.Episodes != null && movie.Episodes.Any())
            {
                var userRatings = currentUserId.HasValue
                    ? await _context.UserEpisodeRatings
                        .Where(r => r.UserId == currentUserId && r.Episode.MovieId == id)
                        .ToDictionaryAsync(r => r.EpisodeId, r => r.Rating)
                    : new Dictionary<int, int>();

                episodeDtos = movie.Episodes.Select(e => new EpisodeDto
                {
                    Id = e.Id,
                    SeasonNumber = e.SeasonNumber,
                    EpisodeNumber = e.EpisodeNumber,
                    Title = e.Title,
                    AverageRating = e.AverageRating,
                    CurrentUserRating = userRatings.ContainsKey(e.Id) ? userRatings[e.Id] : null
                })
                .OrderBy(e => e.SeasonNumber).ThenBy(e => e.EpisodeNumber)
                .ToList();
            }


            var dto = new MovieDetailDto
            {
                Id = movie.Id,
                Title = movie.Title,
                Description = movie.Description,
                Year = movie.Year,
                Genre = movie.Genre,
                Director = movie.Director,
                PosterUrl = movie.PosterUrl,
                TrailerUrl = movie.TrailerUrl,
                AverageRating = movie.AverageRating,
                TotalReviews = movie.Reviews?.Count ?? 0,
                ViewsCount = movie.ViewsCount,

                ReactionCounts = reactions
                    .GroupBy(r => r.Type)
                    .ToDictionary(g => g.Key.ToString(), g => g.Count()),

                CurrentUserVote = (int?)myReactions
                    .FirstOrDefault(r => r.Type == ReactionType.Like || r.Type == ReactionType.Dislike)?.Type,

                CurrentUserEmotion = (int?)myReactions
                    .FirstOrDefault(r => r.Type != ReactionType.Like && r.Type != ReactionType.Dislike)?.Type,
                IsSeries = movie.IsSeries,
                Type = movie.IsSeries ? "Series" : "Movie",
                Episodes = episodeDtos,

                Cast = movie.MovieActors.Select(ma => new CastDto
                {
                    ActorId = ma.ActorId,
                    Name = ma.Actor.Name,
                    Role = ma.Role,
                    IsMainRole = ma.IsMainRole,
                    PhotoUrl = ma.Actor.PhotoUrl
                }).ToList(),
                Awards = movie.Awards.Select(a => new AwardDto
                {
                    Id = a.Id,
                    Name = a.Name,
                    Icon = a.Icon
                }).ToList(),
                MalId = movie.MalId,
                TmdbId = movie.TmdbId,
                CastImported = movie.CastImported
            };

            dto.FranchiseName = movie.Franchise?.Name;
            if (movie.Franchise != null)
            {
                dto.FranchiseMovies = movie.Franchise.Movies
                    .OrderBy(fm => fm.OrderInFranchise)
                    .Select(fm => new FranchiseMovieDto
                    {
                        Id = fm.Id,
                        Title = fm.Title,
                        Order = fm.OrderInFranchise ?? 0,
                        IsCurrent = fm.Id == movie.Id
                    }).ToList();
            }

            return Ok(dto);
        }

        [HttpPost("{id}/react")]
        [Authorize]
        public async Task<IActionResult> ReactToMovie(int id, [FromQuery] ReactionType type)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            bool isVoteGroup = (type == ReactionType.Like || type == ReactionType.Dislike);

            var existingReaction = await _context.MovieReactions
                .FirstOrDefaultAsync(r =>
                    r.MovieId == id &&
                    r.UserId == userId &&
                    (isVoteGroup
                        ? (r.Type == ReactionType.Like || r.Type == ReactionType.Dislike)
                        : (r.Type != ReactionType.Like && r.Type != ReactionType.Dislike))
                );

            if (existingReaction != null)
            {
                if (existingReaction.Type == type)
                {
                    _context.MovieReactions.Remove(existingReaction);
                }
                else
                {
                    existingReaction.Type = type;
                }
            }
            else
            {
                _context.MovieReactions.Add(new MovieReaction
                {
                    MovieId = id,
                    UserId = userId,
                    Type = type
                });
            }

            bool hasReactionAward = await _context.UserAwards.AnyAsync(ua => ua.UserId == userId && ua.Name == "Емоційний глядач");
            bool awardAdded = false;

            if (!hasReactionAward)
            {
                _context.UserAwards.Add(new UserAward
                {
                    UserId = userId,
                    Name = "Емоційний глядач",
                    Icon = "🎭",
                    Description = "За першу залишену реакцію на фільм"
                });
                awardAdded = true;
            }

            await _context.SaveChangesAsync();

            if (awardAdded)
            {
                await _notificationHubContext.Clients.User(userId.ToString()).SendAsync(
                    "AchievementUnlocked",
                    new { name = "Емоційний глядач", icon = "🎭", description = "За першу залишену реакцію на фільм" }
                );
            }

            return Ok();
        }

        [HttpGet("trending")]
        public async Task<ActionResult<IEnumerable<MovieEntity>>> GetTrending()
        {
            var blockedGenres = await GetUserBlockedGenres();
            var blockedActorIds = await GetUserBlockedActorIds();

            var moviesQuery = _context.Movies.Include(m => m.MovieActors).AsNoTracking().AsQueryable();

            foreach (var genre in blockedGenres)
            {
                moviesQuery = moviesQuery.Where(m => m.Genre == null || !m.Genre.ToLower().Contains(genre));
            }

            if (blockedActorIds.Any())
            {
                moviesQuery = moviesQuery.Where(m => !m.MovieActors.Any(ma => blockedActorIds.Contains(ma.ActorId)));
            }

            var trendingMovies = await _context.MovieReactions
                .Where(r => r.Type == ReactionType.Like)
                .GroupBy(r => r.MovieId)
                .Select(g => new { MovieId = g.Key, LikesCount = g.Count() })
                .OrderByDescending(x => x.LikesCount)
                .Take(10)
                .Join(moviesQuery, r => r.MovieId, m => m.Id, (r, m) => m)
                .Where(m => !string.IsNullOrEmpty(m.TrailerUrl))
                .ToListAsync();

            return Ok(trendingMovies);
        }

        [HttpGet("top-rated")]
        public async Task<ActionResult<IEnumerable<MovieDetailDto>>> GetTopRated()
        {
            var query = _context.Movies.Include(m => m.MovieActors).AsNoTracking().AsQueryable();

            var blockedGenres = await GetUserBlockedGenres();
            foreach (var genre in blockedGenres)
            {
                query = query.Where(m => m.Genre == null || !m.Genre.ToLower().Contains(genre));
            }

            var blockedActorIds = await GetUserBlockedActorIds();
            if (blockedActorIds.Any())
            {
                query = query.Where(m => !m.MovieActors.Any(ma => blockedActorIds.Contains(ma.ActorId)));
            }

            var movies = await query
                .OrderByDescending(m => m.AverageRating + (double)m.TotalReviews / (m.TotalReviews + 10))
                .Take(10)
                .Select(m => new MovieDetailDto
                {
                    Id = m.Id,
                    Title = m.Title,
                    PosterUrl = m.PosterUrl,
                    Year = m.Year,
                    AverageRating = m.AverageRating,
                    Genre = m.Genre,
                    CreatedAt = m.CreatedAt,
                    ViewsCount = m.ViewsCount,
                    TotalReviews = m.TotalReviews
                })
                .ToListAsync();

            return Ok(movies);
        }

        private async Task<string?> DownloadAndSaveImage(string imageUrl)
        {
            try
            {
                if (string.IsNullOrEmpty(imageUrl))
                    return null;

                if (imageUrl.StartsWith("/"))
                    return imageUrl;

                using var handler = new HttpClientHandler
                {
                    AllowAutoRedirect = true
                };

                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Add("User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

                var response = await client.GetAsync(imageUrl);

                if (!response.IsSuccessStatusCode)
                    return null;

                var imageBytes = await response.Content.ReadAsByteArrayAsync();

                var fileName = $"{Guid.NewGuid()}.jpg";

                var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
                if (!Directory.Exists(uploadsFolder))
                    Directory.CreateDirectory(uploadsFolder);

                var filePath = Path.Combine(uploadsFolder, fileName);

                await System.IO.File.WriteAllBytesAsync(filePath, imageBytes);

                return $"/uploads/{fileName}";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Не вдалося завантажити картинку: {ex.Message}");
                return null;
            }
        }


        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create(MovieDetailDto dto)
        {
            try
            {
                var exists = await _context.Movies.AnyAsync(m =>
                    m.Title.ToLower() == dto.Title.ToLower() &&
                    m.Year == dto.Year);

                if (exists)
                    return BadRequest($"Фільм '{dto.Title}' ({dto.Year}) вже існує в базі даних!");

                var movie = new MovieEntity
                {
                    Title = dto.Title,
                    Description = dto.Description,
                    Year = dto.Year,
                    Genre = dto.Genre,
                    Director = dto.Director,
                    TrailerUrl = dto.TrailerUrl,
                    IsSeries = dto.IsSeries,
                    CreatedAt = DateTime.UtcNow,
                    PosterUrl = (!string.IsNullOrEmpty(dto.PosterUrl) && dto.PosterUrl.StartsWith("http"))
                                ? await DownloadAndSaveImage(dto.PosterUrl)
                                : dto.PosterUrl,
                    AverageRating = 0,
                    TotalReviews = 0,
                    MalId = dto.MalId,
                    TmdbId = dto.TmdbId,
                    CastImported = false,
                    MovieActors = new List<MovieActor>()
                };

                if (dto.Cast != null)
                {
                    var distinctCast = dto.Cast.GroupBy(c => c.ActorId).Select(g => g.First());
                    foreach (var castMember in distinctCast)
                    {
                        if (castMember.ActorId > 0)
                        {
                            movie.MovieActors.Add(new MovieActor
                            {
                                ActorId = castMember.ActorId,
                                IsMainRole = castMember.IsMainRole,
                                Role = castMember.Role
                            });
                        }
                    }
                }

                if (!string.IsNullOrWhiteSpace(dto.NewFranchiseName))
                {
                    var newFranchise = new Franchise { Name = dto.NewFranchiseName };
                    _context.Franchises.Add(newFranchise);
                    await _context.SaveChangesAsync();
                    movie.FranchiseId = newFranchise.Id;
                }
                else
                {
                    movie.FranchiseId = dto.FranchiseId > 0 ? dto.FranchiseId : null;
                }

                movie.OrderInFranchise = dto.OrderInFranchise > 0 ? dto.OrderInFranchise : null;

                _context.Movies.Add(movie);
                await _context.SaveChangesAsync();

                return Ok(new { id = movie.Id });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n❌ ПОМИЛКА ЗБЕРЕЖЕННЯ: {ex.Message}");
                if (ex.InnerException != null)
                    Console.WriteLine($"🔍 ДЕТАЛІ SQL: {ex.InnerException.Message}");

                return StatusCode(500, new
                {
                    message = "Помилка сервера",
                    details = ex.InnerException?.Message ?? ex.Message
                });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, MovieDetailDto dto)
        {
            try
            {
                var movie = await _context.Movies
                    .Include(m => m.MovieActors)
                    .FirstOrDefaultAsync(m => m.Id == id);

                if (movie == null) return NotFound();

                movie.Title = dto.Title;
                movie.Description = dto.Description;
                movie.Year = dto.Year;
                movie.Genre = dto.Genre;
                movie.Director = dto.Director;
                movie.TrailerUrl = dto.TrailerUrl;
                movie.IsSeries = dto.IsSeries;
                movie.MalId = dto.MalId;
                movie.TmdbId = dto.TmdbId;

                if (movie.PosterUrl != dto.PosterUrl)
                {
                    movie.PosterUrl = (!string.IsNullOrEmpty(dto.PosterUrl) && dto.PosterUrl.StartsWith("http"))
                        ? await DownloadAndSaveImage(dto.PosterUrl)
                        : dto.PosterUrl;
                }

                if (!string.IsNullOrWhiteSpace(dto.NewFranchiseName))
                {
                    var newFranchise = new Franchise { Name = dto.NewFranchiseName };
                    _context.Franchises.Add(newFranchise);
                    await _context.SaveChangesAsync();
                    movie.FranchiseId = newFranchise.Id;
                }
                else
                {
                    movie.FranchiseId = dto.FranchiseId > 0 ? dto.FranchiseId : null;
                }

                movie.OrderInFranchise = dto.OrderInFranchise > 0 ? dto.OrderInFranchise : null;

                if (dto.Cast != null)
                {
                    var distinctCast = dto.Cast.GroupBy(c => c.ActorId).Select(g => g.First()).ToList();
                    var existingActorIds = movie.MovieActors.Select(ma => ma.ActorId).ToList();

                    var actorsToRemove = movie.MovieActors.Where(ma => !distinctCast.Any(dc => dc.ActorId == ma.ActorId)).ToList();
                    foreach (var remove in actorsToRemove)
                        movie.MovieActors.Remove(remove);

                    foreach (var castMember in distinctCast)
                    {
                        var existing = movie.MovieActors.FirstOrDefault(ma => ma.ActorId == castMember.ActorId);
                        if (existing != null)
                        {
                            existing.Role = castMember.Role;
                            existing.IsMainRole = castMember.IsMainRole;
                        }
                        else if (castMember.ActorId > 0)
                        {
                            movie.MovieActors.Add(new MovieActor
                            {
                                ActorId = castMember.ActorId,
                                IsMainRole = castMember.IsMainRole,
                                Role = castMember.Role
                            });
                        }
                    }
                }

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n❌ ПОМИЛКА ОНОВЛЕННЯ ФІЛЬМУ: {ex.Message}");
                if (ex.InnerException != null) Console.WriteLine($"🔍 ДЕТАЛІ: {ex.InnerException.Message}");
                return StatusCode(500, new { message = "Помилка при оновленні", details = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var movie = await _context.Movies.FindAsync(id);
            if (movie == null) return NotFound();

            _context.Movies.Remove(movie);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("new")]
        public async Task<ActionResult<IEnumerable<MovieDetailDto>>> GetNew()
        {
            var query = _context.Movies.Include(m => m.MovieActors).AsNoTracking().AsQueryable();

            var blockedGenres = await GetUserBlockedGenres();
            foreach (var genre in blockedGenres)
            {
                query = query.Where(m => m.Genre == null || !m.Genre.ToLower().Contains(genre));
            }

            var blockedActorIds = await GetUserBlockedActorIds();
            if (blockedActorIds.Any())
            {
                query = query.Where(m => !m.MovieActors.Any(ma => blockedActorIds.Contains(ma.ActorId)));
            }

            var movies = await query
                .OrderByDescending(m => m.CreatedAt)
                .Take(10)
                .Select(m => new MovieDetailDto
                {
                    Id = m.Id,
                    Title = m.Title,
                    PosterUrl = m.PosterUrl,
                    Year = m.Year,
                    AverageRating = m.AverageRating,
                    Genre = m.Genre,
                    CreatedAt = m.CreatedAt,
                    ViewsCount = m.ViewsCount,
                    TotalReviews = m.TotalReviews
                })
                .ToListAsync();

            return Ok(movies);
        }


        [HttpGet("filters")]
        public async Task<ActionResult<MovieFiltersDto>> GetFilters()
        {
            var rawData = await _context.Movies
                .AsNoTracking()
                .Select(m => new { m.Genre, m.Year })
                .ToListAsync();

            var genres = rawData
                .Where(m => !string.IsNullOrEmpty(m.Genre))
                .SelectMany(m => m.Genre.Split(','))
                .Select(g => g.Trim().ToLower())
                .Distinct()
                .OrderBy(g => g)
                .ToList();

            var years = rawData
                .Select(m => m.Year)
                .Distinct()
                .OrderByDescending(y => y)
                .ToList();

            var awards = await _context.MovieAwards
                .AsNoTracking()
                .Select(ma => new AwardDto
                {
                    Id = ma.Id,
                    Name = ma.Name,
                    Icon = ma.Icon
                })
                .Distinct()
                .OrderBy(a => a.Name)
                .ToListAsync();

            return Ok(new MovieFiltersDto { Genres = genres, Years = years, Awards = awards });
        }
        private async Task<List<string>> GetUserBlockedGenres()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return new List<string>();

            var userId = int.Parse(userIdClaim.Value);

            var userSettings = await _context.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => u.BlockedGenres)
                .FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(userSettings)) return new List<string>();

            return userSettings.ToLower().Split(',', StringSplitOptions.RemoveEmptyEntries)
                                       .Select(g => g.Trim())
                                       .ToList();
        }

        private async Task<List<int>> GetUserBlockedActorIds()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return new List<int>();

            var userId = int.Parse(userIdClaim.Value);

            return await _context.UserBlockedActors
                .Where(uba => uba.UserId == userId)
                .Select(uba => uba.ActorId)
                .ToListAsync();
        }

        [HttpGet("random")]
        public async Task<ActionResult<object>> GetRandom()
        {
            var blockedGenres = await GetUserBlockedGenres();
            var query = _context.Movies.AsNoTracking().AsQueryable();

            foreach (var genre in blockedGenres)
            {
                query = query.Where(m => m.Genre == null || !m.Genre.ToLower().Contains(genre));
            }

            var movieIds = await query.Select(m => m.Id).ToListAsync();

            if (!movieIds.Any())
            {
                return NotFound("Фільмів не знайдено (можливо, занадто суворі фільтри)");
            }

            var random = new Random();
            var randomId = movieIds[random.Next(movieIds.Count)];

            return Ok(new { id = randomId });
        }

        [HttpPost("{id}/history")]
        [Authorize]
        public async Task<IActionResult> AddToHistory(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var existingItem = await _context.WatchHistory
                .FirstOrDefaultAsync(h => h.UserId == userId && h.MovieId == id);

            if (existingItem != null)
            {
                existingItem.ViewedAt = DateTime.UtcNow;
            }
            else
            {
                _context.WatchHistory.Add(new WatchHistoryItem
                {
                    UserId = userId,
                    MovieId = id,
                    ViewedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpGet("history")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<MovieDetailDto>>> GetHistory(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var historyQuery = _context.WatchHistory
                .AsNoTracking()
                .Where(h => h.UserId == userId)
                .OrderByDescending(h => h.ViewedAt)
                .Include(h => h.Movie);

            var movies = await historyQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(h => new MovieDetailDto
                {
                    Id = h.Movie.Id,
                    Title = h.Movie.Title,
                    PosterUrl = h.Movie.PosterUrl,
                    Year = h.Movie.Year,
                    Description = h.Movie.Description,
                    AverageRating = h.Movie.AverageRating,
                    Genre = h.Movie.Genre,
                    CreatedAt = h.Movie.CreatedAt
                })
                .ToListAsync();

            return Ok(movies);
        }

        [HttpPost("rate-episode/{episodeId}")]
        [Authorize]
        public async Task<IActionResult> RateEpisode(int episodeId, [FromQuery] int rating)
        {
            if (rating < 1 || rating > 10) return BadRequest("Оцінка має бути від 1 до 10");

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var episode = await _context.Episodes
                .Include(e => e.Movie)
                .FirstOrDefaultAsync(e => e.Id == episodeId);

            if (episode == null) return NotFound("Епізод не знайдено");

            var currentRating = await _context.UserEpisodeRatings
                .FirstOrDefaultAsync(r => r.UserId == userId && r.EpisodeId == episodeId);


            if (currentRating != null)
            {
                currentRating.Rating = rating;
            }
            else
            {
                currentRating = new UserEpisodeRating
                {
                    UserId = userId,
                    EpisodeId = episodeId,
                    Rating = rating
                };
                _context.UserEpisodeRatings.Add(currentRating);
            }

            await _context.SaveChangesAsync();

            var episodeAvg = await _context.UserEpisodeRatings
                .Where(r => r.EpisodeId == episodeId)
                .AverageAsync(r => r.Rating);

            episode.AverageRating = episodeAvg;

            var allEpisodesRatings = await _context.Episodes
                .Where(e => e.MovieId == episode.MovieId)
                .Select(e => e.Id == episodeId ? episodeAvg : e.AverageRating)
                .ToListAsync();

            var activeEpisodes = allEpisodesRatings.Where(r => r > 0).ToList();

            double seriesAvg = 0;
            if (activeEpisodes.Any())
            {
                seriesAvg = activeEpisodes.Average();
            }

            if (episode.Movie != null)
            {
                episode.Movie.AverageRating = seriesAvg;
            }

            await _context.SaveChangesAsync();

            return Ok(new { episodeAverage = episodeAvg, seriesAverage = seriesAvg });
        }

        [HttpPost("{movieId}/add-episode")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AddEpisode(int movieId, [FromBody] EpisodeDto dto)
        {
            var episode = new Episode
            {
                MovieId = movieId,
                SeasonNumber = dto.SeasonNumber,
                EpisodeNumber = dto.EpisodeNumber,
                Title = dto.Title,
                AverageRating = 0
            };
            _context.Episodes.Add(episode);
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpPut("episodes/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateEpisode(int id, [FromBody] EpisodeDto dto)
        {
            var episode = await _context.Episodes.FindAsync(id);
            if (episode == null) return NotFound("Епізод не знайдено");

            episode.SeasonNumber = dto.SeasonNumber;
            episode.EpisodeNumber = dto.EpisodeNumber;
            episode.Title = dto.Title ?? string.Empty;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("episodes/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteEpisode(int id)
        {
            var episode = await _context.Episodes.FindAsync(id);
            if (episode == null) return NotFound("Епізод не знайдено");

            var ratings = _context.UserEpisodeRatings.Where(r => r.EpisodeId == id);
            _context.UserEpisodeRatings.RemoveRange(ratings);

            _context.Episodes.Remove(episode);
            await _context.SaveChangesAsync();
            return NoContent();
        }

       [HttpGet("tmdb/search")]
[Authorize(Roles = "Admin")]
public async Task<ActionResult<List<TmdbSearchResultDto>>> SearchTmdb([FromQuery] string query)
{
    if (string.IsNullOrEmpty(query)) return BadRequest();
    var results = await _tmdbService.SearchMoviesAsync(query);
    return Ok(results);
}

        [HttpGet("tmdb/details/{tmdbId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<MovieDetailDto>> GetTmdbDetails(int tmdbId)
        {
            var dto = await _tmdbService.GetMovieDetailsAsync(tmdbId);
            if (dto == null) return NotFound("Film not found in TMDB");
            return Ok(dto);
        }

        [HttpGet("latest")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLatestMovie()
        {
            var latestMovie = await _context.Movies
                .OrderByDescending(m => m.Id)
                .Select(m => new
                {
                    m.Id,
                    m.Title
                })
                .FirstOrDefaultAsync();

            if (latestMovie == null)
            {
                return NotFound();
            }

            return Ok(latestMovie);
        }

        [HttpPost("{id}/increment-view")]
        public async Task<IActionResult> IncrementViewCount(int id)
        {
            var movie = await _context.Movies.FindAsync(id);
            if (movie == null) return NotFound("Фільм не знайдено.");

            movie.ViewsCount += 1;

            await _context.SaveChangesAsync();

            return Ok(new { viewsCount = movie.ViewsCount });
        }

        [HttpGet("franchises")]
        public async Task<IActionResult> GetFranchises()
        {
            var franchises = await _context.Franchises
                .Select(f => new { f.Id, f.Name })
                .OrderBy(f => f.Name)
                .ToListAsync();

            return Ok(franchises);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("{movieId}/import-mal/{malAnimeId}")]
        public async Task<IActionResult> ImportFromMal(int movieId, int malAnimeId, [FromServices] MalIntegrationService malService)
        {
            var movieExists = await _context.Movies.AnyAsync(m => m.Id == movieId);
            if (!movieExists) return NotFound("Фільм/Аніме не знайдено в локальній базі");

            var success = await malService.ImportCharactersAsync(movieId, malAnimeId);

            if (success) return Ok(new { Message = "Персонажів успішно імпортовано з MyAnimeList!" });

            return BadRequest("Не вдалося завантажити дані з MAL.");
        }

        [AllowAnonymous]
        [HttpPost("{movieId}/auto-import-cast")]
        public async Task<IActionResult> AutoImportCast(int movieId, [FromServices] MalIntegrationService malService)
        {
            var movie = await _context.Movies
                .Include(m => m.MovieActors)
                .Include(m => m.VoiceActingRoles)
                    .ThenInclude(v => v.Character)
                .FirstOrDefaultAsync(m => m.Id == movieId);

            if (movie == null) return NotFound("Фільм не знайдено");

            if (movie.CastImported)
                return Ok(new { Message = "Касту вже імпортовано", AlreadyImported = true });

            try
            {
                string importSource = "none";

                if (movie.IsSeries && movie.MalId.HasValue && movie.MalId > 0)
                {
                    Console.WriteLine($"Імпорт персонажів з MAL ({movie.MalId}) для аніме '{movie.Title}'");
                    await malService.ImportCharactersAsync(movieId, movie.MalId.Value);
                    importSource = "mal-characters";
                }
                else if (!movie.IsSeries && movie.TmdbId.HasValue && movie.TmdbId > 0)
                {
                    Console.WriteLine($"Імпорт акторів з TMDB ({movie.TmdbId}) для фільму '{movie.Title}'");
                    await ImportActorsFromTmdb(movieId, movie.TmdbId.Value);
                    importSource = "tmdb-actors";
                }
                else if (movie.MalId.HasValue && movie.MalId > 0)
                {
                    Console.WriteLine($"Резервний імпорт персонажів з MAL ({movie.MalId}) для '{movie.Title}'");
                    await malService.ImportCharactersAsync(movieId, movie.MalId.Value);
                    importSource = "mal-fallback";
                }

                movie.CastImported = true;
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Message = "Касту успішно автоімпортовано",
                    ImportSource = importSource,
                    IsAnime = movie.IsSeries,
                    movie.MalId,
                    movie.TmdbId
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Помилка при автоімпорті касту: {ex.Message}");
                return StatusCode(500, new { Message = "Помилка при імпорті касту", Details = ex.Message });
            }
        }

        [HttpGet("latest-releases")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<object>>> GetLatestReleases()
        {
            var latestMovies = await _context.Movies
                .Include(m => m.Episodes)
                .OrderByDescending(m => m.CreatedAt)
                .Take(5)
                .ToListAsync();

            var result = latestMovies.Select(m => new
            {
                m.Id,
                m.Title,
                m.Description,
                m.PosterUrl,
                BannerUrl = m.PosterUrl,
                Type = m.IsSeries ? "Series" : "Movie",

                LatestSeason = m.IsSeries && m.Episodes != null && m.Episodes.Any()
                    ? m.Episodes.Max(e => e.SeasonNumber)
                    : (int?)null,

                LatestEpisode = m.IsSeries && m.Episodes != null && m.Episodes.Any()
                    ? m.Episodes
                        .Where(e => e.SeasonNumber == m.Episodes.Max(s => s.SeasonNumber))
                        .Max(e => e.EpisodeNumber)
                    : (int?)null
            });

            return Ok(result);
        }

        [HttpGet("{id}/similar")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<object>>> GetSimilarMovies(int id)
        {
            var currentMovie = await _context.Movies.FindAsync(id);
            if (currentMovie == null) return NotFound("Фільм не знайдено");

            if (string.IsNullOrWhiteSpace(currentMovie.Genre))
                return Ok(new List<object>());

            var currentGenres = currentMovie.Genre
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(g => g.Trim().ToLower())
                .ToList();

            int requiredMatches = Math.Min(3, currentGenres.Count);

            var candidateMovies = await _context.Movies
                .Where(m => m.Id != id && !string.IsNullOrEmpty(m.Genre))
                .Select(m => new
                {
                    m.Id,
                    m.Title,
                    m.PosterUrl,
                    m.AverageRating,
                    m.Year,
                    m.Genre,
                    m.IsSeries,
                    m.ViewsCount,
                    m.TotalReviews
                })
                .ToListAsync();

            var similarMovies = candidateMovies
                    .Select(m =>
                    {
                        var movieGenres = m.Genre
                            .Split(',', StringSplitOptions.RemoveEmptyEntries)
                            .Select(g => g.Trim().ToLower())
                            .ToList();

                        int matchCount = currentGenres.Intersect(movieGenres).Count();

                        return new { Movie = m, MatchCount = matchCount };
                    })
                    .Where(x => x.MatchCount >= requiredMatches)
                    .OrderByDescending(x => x.MatchCount)
                    .ThenByDescending(x => x.Movie.AverageRating)
                    .Take(10)
                    .Select(x => new
                    {
                        id = x.Movie.Id,
                        title = x.Movie.Title,
                        posterUrl = x.Movie.PosterUrl,
                        averageRating = x.Movie.AverageRating,
                        year = x.Movie.Year,
                        genre = x.Movie.Genre,
                        type = x.Movie.IsSeries ? "Series" : "Movie",
                        viewsCount = x.Movie.ViewsCount,
                        totalReviews = x.Movie.TotalReviews
                    })
                    .ToList();

            return Ok(similarMovies);
        }
        private async Task ImportActorsFromTmdb(int movieId, int tmdbId)
        {
            var movie = await _context.Movies
                .Include(m => m.MovieActors)
                .Include(m => m.VoiceActingRoles)
                .FirstOrDefaultAsync(m => m.Id == movieId);

            if (movie == null) return;

            var castDtos = await _tmdbService.GetCastAsync(tmdbId, maxActors: 30);

            foreach (var dto in castDtos)
            {
                try
                {
                    var character = await _context.Characters.FirstOrDefaultAsync(c => c.Name == dto.Role);
                    if (character == null)
                    {
                        character = new Character { Name = dto.Role ?? "", ImageUrl = null };
                        _context.Characters.Add(character);
                        await _context.SaveChangesAsync();
                    }

                    var actor = await _context.Actors.FirstOrDefaultAsync(a => a.Name == dto.Name);
                    if (actor == null)
                    {
                        actor = new Actor
                        {
                            Name = dto.Name,
                            Bio = dto.Biography ?? "",
                            PhotoUrl = dto.PhotoUrl,
                            BirthDate = dto.BirthDate
                        };
                        _context.Actors.Add(actor);
                        await _context.SaveChangesAsync();
                    }

                    var roleExists = await _context.VoiceActingRoles
                        .AnyAsync(v => v.CharacterId == character.Id && v.ActorId == actor.Id && v.MovieId == movieId);

                    if (!roleExists)
                    {
                        _context.VoiceActingRoles.Add(new VoiceActingRole
                        {
                            CharacterId = character.Id,
                            ActorId = actor.Id,
                            MovieId = movieId,
                            IsMainRole = dto.IsMainRole
                        });
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Помилка при обробці актора '{dto.Name}': {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
        }

        [HttpGet("{movieId}/quiz-questions")]
        [Authorize]
        public async Task<ActionResult<List<QuizQuestionDto>>> GetQuizQuestions(int movieId)
        {
            var movie = await _context.Movies.FirstOrDefaultAsync(m => m.Id == movieId);
            if (movie == null)
                return NotFound("Фільм не знайдено");

            var questions = GenerateMovieQuizQuestions(movie);

            return Ok(questions);
        }

        [HttpPost("{movieId}/submit-quiz")]
        [Authorize]
        public async Task<ActionResult<object>> SubmitQuiz(int movieId, [FromBody] QuizSubmissionDto submission)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (userId == 0)
                return Unauthorized();

            var movie = await _context.Movies.FirstOrDefaultAsync(m => m.Id == movieId);
            if (movie == null)
                return NotFound("Фільм не знайдено");

            var quizQuestions = GenerateMovieQuizQuestions(movie);
            int correctAnswers = 0;

            for (int i = 0; i < submission.Answers.Count; i++)
            {
                if (i < quizQuestions.Count &&
                    submission.Answers[i].SelectedOptionIndex == quizQuestions[i].CorrectAnswerIndex)
                {
                    correctAnswers++;
                }
            }

            int rating = (int)Math.Round(((double)correctAnswers / quizQuestions.Count) * 100);

            var user = await _context.Users.FindAsync(userId);
            var existingResult = await _context.MovieQuizResults
                .FirstOrDefaultAsync(r => r.UserId == userId && r.MovieId == movieId);

            if (existingResult != null)
            {
                if (rating > existingResult.Rating)
                {
                    int difference = rating - existingResult.Rating;
                    if (user != null) user.TestScore += difference;
                }
            }
            else
            {
                if (user != null) user.TestScore += rating;

                var newResult = new MovieQuizResult
                {
                    UserId = userId,
                    MovieId = movieId,
                    Rating = rating,
                    CorrectAnswers = correctAnswers,
                    TotalQuestions = quizQuestions.Count,
                    CompletedAt = DateTime.UtcNow
                };
                _context.MovieQuizResults.Add(newResult);
            }


            bool perfectAwardAdded = false;
            if (rating == 100)
            {
                bool hasPerfectAward = await _context.UserAwards.AnyAsync(ua => ua.UserId == userId && ua.Name == "Ідеальний знавець");
                if (!hasPerfectAward)
                {
                    _context.UserAwards.Add(new UserAward
                    {
                        UserId = userId,
                        Name = "Ідеальний знавець",
                        Icon = "💯",
                        Description = "За ідеальний результат тесту (100%)"
                    });
                    perfectAwardAdded = true;
                }
            }

            bool warriorAwardAdded = false;
            int totalCompleted = await _context.MovieQuizResults
                .Where(r => r.UserId == userId)
                .Select(r => r.MovieId)
                .Distinct()
                .CountAsync();

            if (existingResult == null) totalCompleted++;

            if (totalCompleted == 10)
            {
                bool hasWarriorAward = await _context.UserAwards.AnyAsync(ua => ua.UserId == userId && ua.Name == "Тестовий воїн");
                if (!hasWarriorAward)
                {
                    _context.UserAwards.Add(new UserAward
                    {
                        UserId = userId,
                        Name = "Тестовий воїн",
                        Icon = "⚔️",
                        Description = "За проходження 10 тестів знання"
                    });
                    warriorAwardAdded = true;
                }
            }

            await _context.SaveChangesAsync();

            if (perfectAwardAdded)
            {
                await _notificationHubContext.Clients.User(userId.ToString()).SendAsync(
                    "AchievementUnlocked",
                    new { name = "Ідеальний знавець", icon = "💯", description = "За ідеальний результат тесту (100%)" }
                );
            }

            if (warriorAwardAdded)
            {
                await _notificationHubContext.Clients.User(userId.ToString()).SendAsync(
                    "AchievementUnlocked",
                    new { name = "Тестовий воїн", icon = "⚔️", description = "За проходження 10 тестів знання" }
                );
            }

            var userStats = await GetUserQuizStats(userId);

            return Ok(new { rating, stats = userStats });
        }

        [HttpGet("quiz-stats")]
        [Authorize]
        public async Task<ActionResult<UserQuizStatsDto>> GetQuizStats()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (userId == 0)
                return Unauthorized();

            var stats = await GetUserQuizStats(userId);
            return Ok(stats);
        }

        private async Task<UserQuizStatsDto> GetUserQuizStats(int userId)
        {
            var results = await _context.MovieQuizResults
                .Where(r => r.UserId == userId)
                .Include(r => r.Movie)
                .OrderByDescending(r => r.CompletedAt)
                .ToListAsync();

            var stats = new UserQuizStatsDto
            {
                TotalQuizzesCompleted = results.Count,
                AverageRating = results.Count > 0 ? results.Average(r => r.Rating) : 0,
                HighestRating = results.Count > 0 ? results.Max(r => r.Rating) : 0,
                LowestRating = results.Count > 0 ? results.Min(r => r.Rating) : 0,
                RecentResults = results.Take(10).Select(r => new MovieQuizResultDto
                {
                    Id = r.Id,
                    MovieId = r.MovieId,
                    MovieTitle = r.Movie.Title,
                    Rating = r.Rating,
                    CorrectAnswers = r.CorrectAnswers,
                    TotalQuestions = r.TotalQuestions,
                    CompletedAt = r.CompletedAt
                }).ToList()
            };

            return stats;
        }

        private List<QuizQuestionDto> GenerateMovieQuizQuestions(MovieEntity movie)
        {
            var random = new Random(movie.Id);
            var questions = new List<QuizQuestionDto>();

            var yearOptions = new List<string> { movie.Year.ToString() };
            yearOptions.Add((movie.Year - 1).ToString());
            yearOptions.Add((movie.Year + 1).ToString());
            yearOptions.Add((movie.Year + 3).ToString());
            var yearShuffled = yearOptions.OrderBy(x => random.Next()).ToList();
            int yearCorrectIndex = yearShuffled.IndexOf(movie.Year.ToString());

            questions.Add(new QuizQuestionDto
            {
                Question = $"У якому році вийшов фільм \"{movie.Title}\"?",
                Options = yearShuffled,
                CorrectAnswerIndex = yearCorrectIndex
            });

            if (!string.IsNullOrEmpty(movie.Genre))
            {
                var genres = movie.Genre.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(g => g.Trim())
                    .Where(g => g.ToLower() != "фільм" && g.ToLower() != "серіал")
                    .ToArray();
                if (genres.Length > 0)
                {
                    var genreOptions = new List<string> { genres[0] };
                    var allGenres = new[] { "Комедія", "Драма", "Жахи", "Триллер", "Фантастика", "Пригода", "Романтика", "Біографія", "Кримінал", "Історичні", "Детектив" };
                    var wrongGenres = allGenres.Where(g => !genres.Contains(g)).OrderBy(x => random.Next()).Take(3).ToList();
                    genreOptions.AddRange(wrongGenres);
                    var genreShuffled = genreOptions.OrderBy(x => random.Next()).ToList();
                    int genreCorrectIndex = genreShuffled.IndexOf(genres[0]);

                    questions.Add(new QuizQuestionDto
                    {
                        Question = $"Який із цих жанрів належить до \"{movie.Title}\"?",
                        Options = genreShuffled,
                        CorrectAnswerIndex = genreCorrectIndex
                    });
                }
            }

            if (!string.IsNullOrEmpty(movie.Director))
            {
                var directorOptions = new List<string> { movie.Director };
                var directors = new[] { "Крістофер Нолан", "Квентін Тарантіно", "Денис Вільнев", "Грета Гервіг", "Райан Кулер", "Пітер Джексон" };
                foreach (var dir in directors)
                {
                    if (dir != movie.Director && directorOptions.Count < 4)
                        directorOptions.Add(dir);
                }
                var directorShuffled = directorOptions.OrderBy(x => random.Next()).ToList();
                int directorCorrectIndex = directorShuffled.IndexOf(movie.Director);

                questions.Add(new QuizQuestionDto
                {
                    Question = $"Хто режисер фільму \"{movie.Title}\"?",
                    Options = directorShuffled,
                    CorrectAnswerIndex = directorCorrectIndex
                });
            }

            var typeOptions = new List<string>
            {
                movie.IsSeries ? "Серіал" : "Фільм",
                movie.IsSeries ? "Фільм" : "Серіал",
                "Мультфільм",
                "Аніме"
            };
            var typeShuffled = typeOptions.OrderBy(x => random.Next()).ToList();
            int typeCorrectIndex = typeShuffled.IndexOf(movie.IsSeries ? "Серіал" : "Фільм");

            questions.Add(new QuizQuestionDto
            {
                Question = $"Це фільм чи серіал: \"{movie.Title}\"?",
                Options = typeShuffled,
                CorrectAnswerIndex = typeCorrectIndex
            });

            var ratingStr = $"{movie.AverageRating:F1}";
            var ratingOptions = new List<string> { ratingStr };
            double rating = Math.Round(movie.AverageRating, 1);

            var alternatives = new HashSet<string> { ratingStr };
            var ratingVariants = new[]
            {
                Math.Max(1, rating - 1.5),
                Math.Min(10, rating + 1.5),
                Math.Max(1, rating - 3),
                Math.Min(10, rating + 2),
                Math.Max(1, rating - 2)
            };

            foreach (var alt in ratingVariants)
            {
                var altStr = $"{alt:F1}";
                if (!alternatives.Contains(altStr) && ratingOptions.Count < 4)
                {
                    ratingOptions.Add(altStr);
                    alternatives.Add(altStr);
                }
            }

            var ratingShuffled = ratingOptions.OrderBy(x => random.Next()).ToList();
            int ratingCorrectIndex = ratingShuffled.IndexOf(ratingStr);

            questions.Add(new QuizQuestionDto
            {
                Question = $"Який рейтинг у фільму \"{movie.Title}\"?",
                Options = ratingShuffled,
                CorrectAnswerIndex = ratingCorrectIndex
            });

            return questions;
        }

        [HttpGet("recommended")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<object>>> GetRecommended()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var historyIds = await _context.WatchHistory
                .Where(h => h.UserId == userId)
                .Select(h => h.MovieId)
                .ToListAsync();

            var likedIds = await _context.MovieReactions
                .Where(r => r.UserId == userId && r.Type == ReactionType.Like)
                .Select(r => r.MovieId)
                .ToListAsync();

            var interactedIds = historyIds.Concat(likedIds).Distinct().ToList();

            if (!interactedIds.Any())
            {
                return Ok(new List<object>());
            }

            var interactedGenresRaw = await _context.Movies
                .AsNoTracking()
                .Where(m => interactedIds.Contains(m.Id) && !string.IsNullOrEmpty(m.Genre))
                .Select(m => m.Genre)
                .ToListAsync();

            var favoriteGenres = interactedGenresRaw
                .SelectMany(g => g.Split(',', StringSplitOptions.RemoveEmptyEntries))
                .Select(g => g.Trim().ToLower())
                .GroupBy(g => g)
                .OrderByDescending(g => g.Count())
                .Take(3)
                .Select(g => g.Key)
                .ToList();

            if (!favoriteGenres.Any())
            {
                return Ok(new List<object>());
            }

            var blockedGenres = await GetUserBlockedGenres();
            var blockedActorIds = await GetUserBlockedActorIds();

            var query = _context.Movies
                .Include(m => m.MovieActors)
                .AsNoTracking()
                .Where(m => !interactedIds.Contains(m.Id) && !string.IsNullOrEmpty(m.Genre));

            foreach (var genre in blockedGenres)
            {
                query = query.Where(m => !m.Genre.ToLower().Contains(genre));
            }

            if (blockedActorIds.Any())
            {
                query = query.Where(m => !m.MovieActors.Any(ma => blockedActorIds.Contains(ma.ActorId)));
            }

            var candidates = await query
                .OrderByDescending(m => m.AverageRating)
                .Take(100)
                .ToListAsync();

            var recommended = candidates
                .Where(m =>
                {
                    var mGenres = m.Genre.ToLower();
                    return favoriteGenres.Any(fg => mGenres.Contains(fg));
                })
                .Take(10)
                .Select(m => new
                {
                    id = m.Id,
                    title = m.Title,
                    posterUrl = m.PosterUrl,
                    averageRating = m.AverageRating,
                    year = m.Year,
                    genre = m.Genre,
                    type = m.IsSeries ? "Series" : "Movie",
                    viewsCount = m.ViewsCount
                })
                .ToList();

            return Ok(recommended);
        }
    }
}