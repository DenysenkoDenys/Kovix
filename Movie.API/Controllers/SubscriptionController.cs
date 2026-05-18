using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Movie.API.Data;
using Movie.API.DTOs;
using Stripe;
using Stripe.Checkout;
using System.Security.Claims;

namespace Movie.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SubscriptionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly Movie.API.Services.IEmailService _emailService;

        public SubscriptionController(ApplicationDbContext context, IConfiguration configuration, Movie.API.Services.IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
        }

        [HttpPost("send-activation-email/{userId}")]
        [Authorize(Roles = "Admin,Moderator")]
        public async Task<IActionResult> SendActivationEmail(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("Користувача не знайдено.");

            if (string.IsNullOrEmpty(user.Email)) return BadRequest("Користувач не має email.");

            try
            {
                var subject = "Вітаємо! Ваш VIP статус активовано - Kovix";
                var body = $@"<p>Привіт {user.Username},</p>
                             <p>Ваш VIP статус активовано до <strong>{user.PremiumUntil?.ToLocalTime():f}</strong>.</p>
                             <p>Насолоджуйтесь ексклюзивними можливостями!</p>
                             <p>З повагою, команда Kovix</p>";

                await _emailService.SendEmailAsync(user.Email, subject, body);
                return Ok(new { sent = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Не вдалося відправити email: {ex.Message}");
                return StatusCode(500, "Не вдалося відправити email.");
            }
        }

        [HttpPost("send-reminder-7/{userId}")]
        [Authorize(Roles = "Admin,Moderator")]
        public async Task<IActionResult> Send7DayReminder(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("Користувача не знайдено.");
            if (string.IsNullOrEmpty(user.Email)) return BadRequest("Користувач не має email.");

            try
            {
                var subject = "Нагадування: VIP статус закінчиться через 7 днів - Kovix";
                var body = $@"<p>Привіт {user.Username},</p>
                             <p>Це нагадування що ваш VIP статус закінчиться {user.PremiumUntil?.ToLocalTime():f}.</p>
                             <p>Щоб не переривати доступ, продовжіть підписку на <a href='http://localhost:5173/membership'>Підписки</a>.</p>
                             <p>З повагою, команда Kovix</p>";

                await _emailService.SendEmailAsync(user.Email, subject, body);
                user.PremiumReminder7Sent = true;
                await _context.SaveChangesAsync();
                return Ok(new { sent = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Не вдалося відправити 7-денне нагадування: {ex.Message}");
                return StatusCode(500, "Не вдалося відправити email.");
            }
        }

        [HttpPost("send-reminder-1/{userId}")]
        [Authorize(Roles = "Admin,Moderator")]
        public async Task<IActionResult> Send1DayReminder(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("Користувача не знайдено.");
            if (string.IsNullOrEmpty(user.Email)) return BadRequest("Користувач не має email.");

            try
            {
                var subject = "Нагадування: VIP статус закінчиться завтра - Kovix";
                var body = $@"<p>Привіт {user.Username},</p>
                             <p>Ваш VIP статус закінчиться завтра ({user.PremiumUntil?.ToLocalTime():f}). Якщо хочете продовжити, будь ласка, відвідайте <a href='http://localhost:5173/membership'>Підписки</a>.</p>
                             <p>З повагою, команда Kovix</p>";

                await _emailService.SendEmailAsync(user.Email, subject, body);
                user.PremiumReminder1Sent = true;
                await _context.SaveChangesAsync();
                return Ok(new { sent = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Не вдалося відправити 1-денне нагадування: {ex.Message}");
                return StatusCode(500, "Не вдалося відправити email.");
            }
        }

        [HttpPost("create-checkout")]
        [Authorize]
        public IActionResult CreateCheckout([FromBody] SubscriptionDTO request)
        {
            StripeConfiguration.ApiKey = _configuration["Stripe:SecretKey"];

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
                return Unauthorized("Користувач не авторизований.");

            var domain = "http://localhost:5173";

            long priceAmount = request.PlanId == "yearly" ? 2999 : 299;

            var options = new SessionCreateOptions
            {
                PaymentMethodTypes = new List<string> { "card" },

                LineItems = new List<SessionLineItemOptions>
                {
                    new SessionLineItemOptions
                    {
                        PriceData = new SessionLineItemPriceDataOptions
                        {
                            UnitAmount = priceAmount,
                            Currency = "usd",
                            ProductData = new SessionLineItemPriceDataProductDataOptions
                            {
                                Name = request.PlanId == "yearly"
                                    ? "Kovix Premium (1 Рік)"
                                    : "Kovix Premium (1 Місяць)"
                            }
                        },
                        Quantity = 1
                    }
                },

                Mode = "payment",
                SuccessUrl = domain + "/payment/success?session_id={CHECKOUT_SESSION_ID}",
                CancelUrl = domain + "/membership",
                ClientReferenceId = userId,

                Metadata = new Dictionary<string, string>
                {
                    { "PlanId", request.PlanId }
                }
            };

            var service = new SessionService();
            var session = service.Create(options);

            return Ok(new { url = session.Url });
        }

        [HttpPost("confirm-payment")]
        [Authorize]
        public async Task<IActionResult> ConfirmPayment([FromBody] ConfirmPaymentDto request)
        {
            StripeConfiguration.ApiKey = _configuration["Stripe:SecretKey"];

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized();

            var service = new SessionService();
            var session = service.Get(request.SessionId);

            if (session.PaymentStatus == "paid" && session.ClientReferenceId == userIdStr)
            {
                var user = await _context.Users.FindAsync(userId);

                if (user == null)
                    return NotFound("Користувача не знайдено.");

                user.IsPremium = true;

                string planId = session.Metadata.ContainsKey("PlanId")
                    ? session.Metadata["PlanId"]
                    : "monthly";

                int monthsToAdd = planId == "yearly" ? 12 : 1;

                user.PremiumUntil = user.PremiumUntil.HasValue && user.PremiumUntil > DateTime.UtcNow
                    ? user.PremiumUntil.Value.AddMonths(monthsToAdd)
                    : DateTime.UtcNow.AddMonths(monthsToAdd);

                user.PremiumReminder7Sent = false;
                user.PremiumReminder1Sent = false;

                await _context.SaveChangesAsync();

                try
                {
                    var subject = "Вітаємо! Ваш VIP статус активовано - Kovix";
                    var body = $@"<p>Привіт {user.Username},</p>
                                 <p>Дякуємо за підписку — ваш VIP статус активовано до <strong>{user.PremiumUntil?.ToLocalTime():f}</strong>.</p>
                                 <p>Насолоджуйтесь ексклюзивними можливостями!</p>
                                 <p>З повагою, команда Kovix</p>";

                    if (!string.IsNullOrEmpty(user.Email))
                        await _emailService.SendEmailAsync(user.Email, subject, body);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Не вдалося відправити email про активацію VIP: {ex.Message}");
                }

                return Ok(new { success = true, isPremium = user.IsPremium, premiumUntil = user.PremiumUntil });
            }

            return BadRequest("Оплата не підтверджена.");
        }
    }
}