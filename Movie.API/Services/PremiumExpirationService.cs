using Microsoft.EntityFrameworkCore;
using Movie.API.Data;

namespace Movie.API.Services
{
    public class PremiumExpirationService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<PremiumExpirationService> _logger;

        public PremiumExpirationService(IServiceScopeFactory scopeFactory, ILogger<PremiumExpirationService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("PremiumExpirationService started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var emailService = scope.ServiceProvider.GetService<IEmailService>();

                    var now = DateTime.UtcNow;

                    var toRemind7 = await db.Users
                        .Where(u => u.IsPremium && u.PremiumUntil.HasValue && !u.PremiumReminder7Sent && u.PremiumUntil > now && u.PremiumUntil <= now.AddDays(7))
                        .ToListAsync(stoppingToken);

                    foreach (var user in toRemind7)
                    {
                        if (emailService != null && !string.IsNullOrEmpty(user.Email))
                        {
                            try
                            {
                                var subject = "Нагадування: VIP статус закінчиться через 7 днів - Kovix";
                                var body = $"<p>Привіт {user.Username},</p><p>Ваш VIP статус закінчиться {user.PremiumUntil?.ToLocalTime():f}. Щоб не переривати доступ, продовжіть підписку на сторінці <a href=\"http://localhost:5173/membership\">Підписки</a>.</p><p>З повагою, команда Kovix</p>";
                                await emailService.SendEmailAsync(user.Email, subject, body);
                                user.PremiumReminder7Sent = true;
                                await db.SaveChangesAsync(stoppingToken);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(ex, "Не вдалося відправити 7-денне нагадування для користувача {UserId}", user.Id);
                            }
                        }
                    }

                    var toRemind1 = await db.Users
                        .Where(u => u.IsPremium && u.PremiumUntil.HasValue && !u.PremiumReminder1Sent && u.PremiumUntil > now && u.PremiumUntil <= now.AddDays(1))
                        .ToListAsync(stoppingToken);

                    foreach (var user in toRemind1)
                    {
                        if (emailService != null && !string.IsNullOrEmpty(user.Email))
                        {
                            try
                            {
                                var subject = "Нагадування: VIP статус закінчиться завтра - Kovix";
                                var body = $"<p>Привіт {user.Username},</p><p>Ваш VIP статус закінчиться завтра ({user.PremiumUntil?.ToLocalTime():f}). Якщо хочете продовжити, будь ласка, відвідайте <a href=\"http://localhost:5173/membership\">Підписки</a>.</p><p>З повагою, команда Kovix</p>";
                                await emailService.SendEmailAsync(user.Email, subject, body);
                                user.PremiumReminder1Sent = true;
                                await db.SaveChangesAsync(stoppingToken);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(ex, "Не вдалося відправити 1-денне нагадування для користувача {UserId}", user.Id);
                            }
                        }
                    }

                    var expiredUsers = await db.Users
                        .Where(u => u.IsPremium && u.PremiumUntil.HasValue && u.PremiumUntil <= now)
                        .ToListAsync(stoppingToken);

                    foreach (var user in expiredUsers)
                    {
                        user.IsPremium = false;
                        user.PremiumReminder7Sent = false;
                        user.PremiumReminder1Sent = false;
                        await db.SaveChangesAsync(stoppingToken);

                        if (emailService != null && !string.IsNullOrEmpty(user.Email))
                        {
                            try
                            {
                                var subject = "Ваш VIP статус закінчився - Kovix";
                                var body = $"<p>Привіт {user.Username},</p><p>Ваш VIP статус закінчився {user.PremiumUntil?.ToLocalTime():f}. Якщо хочете продовжити, будь ласка, відвідайте сторінку <a href=\"http://localhost:5173/membership\">Підписки</a>.</p><p>З повагою, команда Kovix</p>";
                                await emailService.SendEmailAsync(user.Email, subject, body);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(ex, "Не вдалося відправити email про закінчення VIP для користувача {UserId}", user.Id);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Помилка при перевірці закінчення VIP статусів.");
                }

                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }
    }
}