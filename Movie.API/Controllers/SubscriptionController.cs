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

        public SubscriptionController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
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

                await _context.SaveChangesAsync();

                return Ok(new { success = true });
            }

            return BadRequest("Оплата не підтверджена.");
        }
    }
}