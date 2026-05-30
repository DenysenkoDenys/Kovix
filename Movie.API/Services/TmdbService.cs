using GTranslate.Translators;
using Microsoft.EntityFrameworkCore;
using Movie.API.Data;
using Movie.API.DTOs;
using Movie.API.Models.TMdb;

namespace Movie.API.Services
{
    public class TmdbService
    {
        private const string TMDB_API_KEY = "f797261e58f7c171a30e466ce870cfbe";
        private readonly ApplicationDbContext _context;
        private readonly HttpClient _httpClient;

        public TmdbService(ApplicationDbContext context, HttpClient httpClient)
        {
            _context = context;
            _httpClient = httpClient;
        }
        public async Task<List<TmdbSearchResultDto>> SearchMoviesAsync(string query)
        {
            var url = $"https://api.themoviedb.org/3/search/movie?api_key={TMDB_API_KEY}&query={Uri.EscapeDataString(query)}&language=uk-UA";
            var response = await _httpClient.GetFromJsonAsync<TmdbSearchResult>(url);

            if (response?.Results == null) return new List<TmdbSearchResultDto>();

            return response.Results.Select(m => new TmdbSearchResultDto
            {
                TmdbId = m.Id,
                Title = m.Title,
                ReleaseDate = m.Release_Date,
                PosterUrl = !string.IsNullOrEmpty(m.Poster_Path)
                    ? $"https://image.tmdb.org/t/p/w92{m.Poster_Path}"
                    : null
            }).ToList();
        }

        public async Task<List<CastDto>> GetCastAsync(int tmdbId, int maxActors = 50)
        {
            var url = $"https://api.themoviedb.org/3/movie/{tmdbId}?api_key={TMDB_API_KEY}&append_to_response=credits&language=uk-UA";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
                return new List<CastDto>();

            var json = await response.Content.ReadAsStringAsync();
            dynamic data = Newtonsoft.Json.JsonConvert.DeserializeObject(json);

            if (data.credits == null || data.credits.cast == null)
                return new List<CastDto>();

            var castMembers = ((IEnumerable<dynamic>)data.credits.cast).Take(maxActors);
            var translator = new AggregateTranslator();
            var result = new List<CastDto>();

            foreach (var person in castMembers)
            {
                await Task.Delay(30);

                string name = person.name;
                string role = person.character;
                string profilePath = person.profile_path;
                int personId = person.id;
                int order = person.order != null ? (int)person.order : 999;
                bool isMainRole = order < 6;

                if (System.Text.RegularExpressions.Regex.IsMatch(name, @"[a-zA-Z]"))
                {
                    try
                    {
                        var nameResult = await translator.TranslateAsync(name, "uk");
                        name = nameResult.Translation;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Не вдалося перекласти ім'я '{name}': {ex.Message}");
                    }
                }

                var existingActor = await _context.Actors.FirstOrDefaultAsync(a => a.Name == name);

                string biography = existingActor?.Bio ?? "";
                DateTime? birthDate = existingActor?.BirthDate;

                if (existingActor == null)
                {
                    (biography, birthDate) = await FetchPersonDetailsAsync(translator, personId, name);
                }

                result.Add(new CastDto
                {
                    ActorId = existingActor?.Id ?? 0,
                    Name = name,
                    Role = role,
                    Biography = biography,
                    PhotoUrl = !string.IsNullOrEmpty(profilePath)
                        ? $"https://image.tmdb.org/t/p/w500{profilePath}"
                        : null,
                    IsMainRole = isMainRole,
                    BirthDate = birthDate
                });
            }

            return result;
        }

        private async Task<(string biography, DateTime? birthDate)> FetchPersonDetailsAsync(
            AggregateTranslator translator, int personId, string nameForLog)
        {
            string biography = "";
            DateTime? birthDate = null;

            try
            {
                var ukUrl = $"https://api.themoviedb.org/3/person/{personId}?api_key={TMDB_API_KEY}&language=uk-UA";
                var personResponse = await _httpClient.GetAsync(ukUrl);

                if (personResponse.IsSuccessStatusCode)
                {
                    var personJson = await personResponse.Content.ReadAsStringAsync();
                    dynamic personData = Newtonsoft.Json.JsonConvert.DeserializeObject(personJson);

                    biography = personData.biography ?? "";

                    string bdayStr = personData.birthday;
                    if (DateTime.TryParse(bdayStr, out DateTime parsedDate))
                        birthDate = parsedDate;

                    if (string.IsNullOrWhiteSpace(biography))
                    {
                        var enUrl = $"https://api.themoviedb.org/3/person/{personId}?api_key={TMDB_API_KEY}&language=en-US";
                        var enResponse = await _httpClient.GetAsync(enUrl);

                        if (enResponse.IsSuccessStatusCode)
                        {
                            var enJson = await enResponse.Content.ReadAsStringAsync();
                            dynamic enData = Newtonsoft.Json.JsonConvert.DeserializeObject(enJson);
                            string enBio = enData.biography ?? "";

                            if (!string.IsNullOrWhiteSpace(enBio))
                            {
                                try
                                {
                                    var bioResult = await translator.TranslateAsync(enBio, "uk");
                                    biography = bioResult.Translation;
                                }
                                catch { biography = enBio; }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Не вдалося отримати деталі для '{nameForLog}': {ex.Message}");
            }

            return (biography, birthDate);
        }
        public async Task<MovieDetailDto?> GetMovieDetailsAsync(int tmdbId)
        {
            var url = $"https://api.themoviedb.org/3/movie/{tmdbId}?api_key={TMDB_API_KEY}&language=uk-UA";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            dynamic data = Newtonsoft.Json.JsonConvert.DeserializeObject(json);

            var dto = new MovieDetailDto
            {
                Title = data.title,
                Description = data.overview,
                PosterUrl = data.poster_path != null
                    ? $"https://image.tmdb.org/t/p/original{data.poster_path}"
                    : null,
                Year = 0,
                TmdbId = tmdbId,
                Cast = await GetCastAsync(tmdbId)
            };

            string releaseDate = data.release_date;
            if (DateTime.TryParse(releaseDate, out DateTime date))
                dto.Year = date.Year;

            return dto;
        }
    }
}