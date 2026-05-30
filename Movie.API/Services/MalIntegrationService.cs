using Microsoft.EntityFrameworkCore;
using Movie.API.Data;
using Movie.API.Models;
using Movie.API.Models.Jikan;
using System.Text.Json;

namespace Movie.API.Services
{
    public class MalIntegrationService
    {
        private readonly HttpClient _httpClient;
        private readonly ApplicationDbContext _context;

        public MalIntegrationService(HttpClient httpClient, ApplicationDbContext context)
        {
            _httpClient = httpClient;
            if (!_httpClient.DefaultRequestHeaders.Contains("User-Agent"))
            {
                _httpClient.DefaultRequestHeaders.Add("User-Agent", "Kovix-Movie-App");
            }
            _context = context;
        }

        public async Task<bool> ImportCharactersAsync(int movieId, int malAnimeId)
        {
            try
            {
                Console.WriteLine($"\nПочинаємо імпорт з MAL для аніме ID: {malAnimeId}");
                var response = await _httpClient.GetAsync($"https://api.jikan.moe/v4/anime/{malAnimeId}/characters");

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"Помилка Jikan API: {response.StatusCode}");
                    return false;
                }

                var jsonString = await response.Content.ReadAsStringAsync();
                var jikanData = JsonSerializer.Deserialize<JikanCharacterResponse>(jsonString, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (jikanData?.Data == null || !jikanData.Data.Any())
                {
                    Console.WriteLine("Jikan API не повернув жодного персонажа.");
                    return false;
                }

                var charactersToImport = jikanData.Data.Take(15).ToList();
                Console.WriteLine($"Знайдено персонажів: {charactersToImport.Count}. Зберігаємо в БД...");

                foreach (var item in charactersToImport)
                {
                    if (item.Character == null) continue;

                    string charImageUrl = item.Character.Images?.Jpg?.ImageUrl ?? "";
                    string charName = item.Character.Name ?? "Невідомий персонаж";

                    bool isMainRole = !string.IsNullOrEmpty(item.Role) && 
                                      item.Role.Equals("Main", StringComparison.OrdinalIgnoreCase);

                    Console.WriteLine($"  Персонаж: {charName} | Роль: {item.Role ?? "Unknown"} | IsMain: {isMainRole}");

                    var character = await _context.Characters.FirstOrDefaultAsync(c => c.Name == charName);
                    if (character == null)
                    {
                        character = new Character { Name = charName, ImageUrl = charImageUrl };
                        _context.Characters.Add(character);
                        await _context.SaveChangesAsync();
                    }

                    if (item.VoiceActors != null)
                    {
                        foreach (var va in item.VoiceActors.Take(6))
                        {
                            if (va.Person == null) continue;

                            string actorName = va.Person.Name ?? "Невідомий актор";
                            string actorImageUrl = va.Person.Images?.Jpg?.ImageUrl ?? "";
                            string language = va.Language ?? "Japanese";
                            bool isOriginal = language.Equals("Japanese", StringComparison.OrdinalIgnoreCase); 

                            var actor = await _context.Actors.FirstOrDefaultAsync(a => a.Name == actorName);
                            if (actor == null)
                            {
                                actor = new Actor { Name = actorName, PhotoUrl = actorImageUrl, Bio = $"Сейю з MyAnimeList" };
                                _context.Actors.Add(actor);
                                await _context.SaveChangesAsync();
                            }

                            var roleExists = await _context.VoiceActingRoles.AnyAsync(r =>
                                r.MovieId == movieId && r.CharacterId == character.Id && r.ActorId == actor.Id);

                            if (!roleExists)
                            {
                                _context.VoiceActingRoles.Add(new VoiceActingRole
                                {
                                    MovieId = movieId,
                                    CharacterId = character.Id,
                                    ActorId = actor.Id,
                                    Language = language,
                                    IsOriginal = isOriginal,
                                    IsMainRole = isMainRole  
                                });
                            }
                        }
                    }
                    await Task.Delay(20);
                }

                await _context.SaveChangesAsync();
                Console.WriteLine("Імпорт успішно завершено!");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n[КРИТИЧНА ПОМИЛКА ІМПОРТУ MAL]: {ex.Message}");
                if (ex.InnerException != null) Console.WriteLine($"[ДЕТАЛІ]: {ex.InnerException.Message}");
                return false;
            }
        }
    }
}