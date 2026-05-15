using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Movie.API.Data;
using Movie.API.DTOs;
using Movie.API.Models;
using Movie.API.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Movie.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;

        public AuthController(ApplicationDbContext context, IConfiguration configuration, IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto request)
        {

            if (string.IsNullOrEmpty(request.CaptchaToken))
            {
                return BadRequest("Капча обов'язкова");
            }

            bool isCaptchaValid = await VerifyCaptchaAsync(request.CaptchaToken);
            if (!isCaptchaValid)
            {
                return BadRequest("Перевірка капчі не пройдена. Ви бот?");
            }

            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                return BadRequest("Користувач з таким Email вже існує.");
            }

            string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new User
            {
                Username = request.Username,
                Email = request.Email,
                PasswordHash = passwordHash,
                Role = "User",
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            try
            {
                string subject = "Вітаємо у Kovix! 🎬";
                string body = $@"
            <h1>Привіт, {user.Username}!</h1>
            <p>Дякуємо за реєстрацію у нашому кіно-додатку.</p>
            <p>Тепер ви можете створювати списки, ставити оцінки та додавати друзів.</p>
            <br>
            <p>З повагою,<br>Команда Kovix</p>";

                await _emailService.SendEmailAsync(user.Email, subject, body);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Не вдалося відправити email: {ex.Message}");
            }

            return Ok(new { message = "Реєстрація успішна!" });
        }

        
        [HttpPost("login")]
        public async Task<ActionResult<string>> Login(LoginDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
            {
                return BadRequest("Користувача не знайдено.");
            }

            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return BadRequest("Невірний пароль.");
            }

            if (!user.IsEmailVerified && user.ExternalProvider != "Google" && user.Role != "Admin" && user.Role != "Moderator")
            {
                string tempToken = CreateToken(user);

                return StatusCode(403, new
                {
                    message = "EMAIL_NOT_VERIFIED",
                    token = tempToken,
                    email = user.Email
                });
            }

            string token = CreateToken(user);
            return Ok(new { token, role = user.Role, username = user.Username });
        }

        private string CreateToken(User user)
        {
            List<Claim> claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _configuration.GetSection("Jwt:Key").Value!));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256Signature);

            var token = new JwtSecurityToken(
                issuer: _configuration.GetSection("Jwt:Issuer").Value,
                audience: _configuration.GetSection("Jwt:Audience").Value,
                claims: claims,
                expires: DateTime.Now.AddDays(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<User>> GetProfile()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();

            int userId = int.Parse(userIdClaim.Value);

            var user = await _context.Users
                .Include(u => u.Reviews!)
                    .ThenInclude(r => r.Movie)
                .Include(u => u.Awards)
                .Include(u => u.SelectedAward) 
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) return NotFound();

            user.PasswordHash = "";

            return Ok(user);
        }

        [HttpPut("me")]
        [Authorize]
        public async Task<ActionResult<User>> UpdateProfile([FromForm] UserUpdateDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var user = await _context.Users.FindAsync(userId);

            if (user == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(dto.Username))
            {
                user.Username = dto.Username;
            }

            if (dto.DeleteAvatar)
            {
                user.AvatarUrl = null;
            }

            if (dto.Avatar != null)
            {
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                var uniqueFileName = Guid.NewGuid().ToString() + "_" + dto.Avatar.FileName;
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.Avatar.CopyToAsync(stream);
                }

                user.AvatarUrl = $"/uploads/{uniqueFileName}";
            }

            await _context.SaveChangesAsync();

            var fullUser = await _context.Users
                .Include(u => u.Reviews)
                    .ThenInclude(r => r.Movie)
                .Include(u => u.Awards)
                .Include(u => u.SelectedAward) 
                .FirstOrDefaultAsync(u => u.Id == userId);

            var updatedProfile = new
            {
                fullUser!.Id,
                fullUser.Username,
                fullUser.Email,
                fullUser.Role,
                fullUser.AvatarUrl,
                fullUser.IsBlocked,
                fullUser.CreatedAt,
                fullUser.BlockedGenres,
                fullUser.Reviews,
                Awards = fullUser.Awards?.Select(a => new
                {
                    a.Id,
                    a.Name,
                    a.Icon,
                    a.Description,
                    a.IssuedAt
                }).ToList(),
                SelectedAward = fullUser.SelectedAward != null ? new
                {
                    fullUser.SelectedAward.Id,
                    fullUser.SelectedAward.Name,
                    fullUser.SelectedAward.Icon
                } : null
            };

            return Ok(updatedProfile);
        }


        [HttpPut("settings")]
        [Authorize]
        public async Task<IActionResult> UpdateSettings([FromBody] UserContentSettingsDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            user.BlockedGenres = string.Join(",", dto.BlockedGenres).ToLower();

            await _context.SaveChangesAsync();
            return Ok();
        }
        [HttpPost("external-login")]
        public async Task<IActionResult> ExternalLogin([FromBody] ExternalAuthDto dto)
        {
            if (dto.Provider != "Google")
                return BadRequest("Provider not supported");

            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new List<string>
            {
                "411859879387-fltqoda92rij49g7jnols8kgv6cs0gt8.apps.googleusercontent.com"
            }
                };

                var payload = await GoogleJsonWebSignature.ValidateAsync(dto.IdToken, settings);

                var user = await _context.Users.FirstOrDefaultAsync(u =>
                    u.ExternalProvider == "Google" &&
                    u.ExternalId == payload.Subject
                );

                if (user == null && !string.IsNullOrEmpty(payload.Email))
                {
                    user = await _context.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);

                    if (user != null)
                    {
                        user.ExternalProvider = "Google";
                        user.ExternalId = payload.Subject;
                        await _context.SaveChangesAsync();
                    }
                }

                if (user == null)
                {
                    user = new User
                    {
                        Username = payload.Name ?? payload.Email,
                        Email = payload.Email,
                        PasswordHash = "",
                        Role = "User",
                        ExternalProvider = "Google",
                        ExternalId = payload.Subject,
                        AvatarUrl = payload.Picture,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();
                }

                var token = CreateToken(user);

                return Ok(new
                {
                    token,
                    role = user.Role,
                    username = user.Username,
                    avatarUrl = user.AvatarUrl
                });
            }
            catch (Exception ex)
            {
                return BadRequest("Invalid Google token: " + ex.Message);
            }
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto model)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();

            int userId = int.Parse(userIdClaim.Value);

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return Unauthorized("Користувача не знайдено");

            if (!BCrypt.Net.BCrypt.Verify(model.CurrentPassword, user.PasswordHash))
            {
                return BadRequest("Поточний пароль невірний");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.NewPassword);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Пароль успішно змінено!" });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);

            var responseMessage = new { message = "Якщо такий Email існує, ми відправили інструкції." };

            if (user == null)
                return Ok(responseMessage);

            if (user.ExternalProvider == "Google")
            {
                string googleBody = $@"
            <h1>Спосіб входу в Kovix</h1>
            <p>Привіт, {user.Username}!</p>
            <p>Ви надіслали запит на зміну пароля, але ваш акаунт зареєстровано через <strong>Google</strong>.</p>
            <p>Вам не потрібен пароль. Просто натисніть кнопку 'Увійти через Google' на сайті.</p>
            <br>
            <a href='http://localhost:5173/login'>Перейти до входу</a>";

                try
                {
                    await _emailService.SendEmailAsync(user.Email, "Нагадування про вхід - Kovix", googleBody);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Email send failed: {ex.Message}");
                }

                return Ok(responseMessage);
            }

            var token = Guid.NewGuid().ToString();

            user.PasswordResetToken = token;
            user.PasswordResetTokenExpires = DateTime.UtcNow.AddHours(1); 

            await _context.SaveChangesAsync();

            var callbackUrl = $"http://localhost:5173/reset-password?email={user.Email}&token={token}";

            string resetBody = $@"
        <h1>Відновлення паролю</h1>
        <p>Натисніть на посилання нижче, щоб створити новий пароль:</p>
        <a href='{callbackUrl}'>Скинути пароль</a>
        <p>Посилання дійсне 1 годину.</p>";

            try
            {
                await _emailService.SendEmailAsync(user.Email, "Скидання паролю - Kovix", resetBody);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Email send failed: {ex.Message}");
            }

            return Ok(responseMessage);
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Email == model.Email &&
                u.PasswordResetToken == model.Token &&
                u.PasswordResetTokenExpires > DateTime.UtcNow);

            if (user == null)
                return BadRequest("Посилання недійсне або термін дії закінчився.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.NewPassword);

            user.PasswordResetToken = null;
            user.PasswordResetTokenExpires = null;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Пароль успішно змінено! Тепер ви можете увійти." });
        }

        [HttpPut("me/title")]
        [Authorize]
        public async Task<IActionResult> UpdateTitle([FromBody] UpdateTitleDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            var userId = int.Parse(userIdClaim!.Value);
            var user = await _context.Users.FindAsync(userId);
            if (user == null) 
            {
                return NotFound();
            }

            if (dto.AwardId.HasValue)
            {
                bool ownsAward = await _context.UserAwards
                    .AnyAsync(a => a.Id == dto.AwardId.Value && a.UserId == userId);

                if (!ownsAward)
                {
                    return BadRequest("У вас немає цієї нагороди.");
                }
            }

            user.SelectedAwardId = dto.AwardId;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Звання успішно оновлено!" });
        }

        [Authorize]
        [HttpPost("send-verification-code")]
        public async Task<IActionResult> SendVerificationCode()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized();

            var userId = int.Parse(userIdString);
            var user = await _context.Users.FindAsync(userId);

            if (user == null) return NotFound();
            if (user.IsEmailVerified) return BadRequest("Email вже підтверджено.");

            var random = new Random();
            var code = random.Next(100000, 999999).ToString();

            user.EmailVerificationCode = code;
            user.EmailVerificationCodeExpiry = DateTime.UtcNow.AddMinutes(15); 

            await _context.SaveChangesAsync();

            var subject = "Підтвердження email на Kovix";
            var body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;'>
                    <h2 style='color: #2196F3; text-align: center;'>Kovix</h2>
                    <p>Привіт, <b>{user.Username}</b>!</p>
                    <p>Твій код для підтвердження електронної пошти:</p>
                    <div style='background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;'>
                        <span style='font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;'>{code}</span>
                    </div>
                    <p style='color: #666; font-size: 14px;'>Код дійсний протягом 15 хвилин. Якщо ти не запитував цей код, просто проігноруй цей лист.</p>
                </div>";

            await _emailService.SendEmailAsync(user.Email, subject, body);

            return Ok(new { message = "Код відправлено на пошту." });
        }

        [Authorize]
        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDto dto)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized();

            var userId = int.Parse(userIdString);
            var user = await _context.Users.FindAsync(userId);

            if (user == null) return NotFound();
            if (user.IsEmailVerified) return BadRequest("Email вже підтверджено.");

            if (user.EmailVerificationCode != dto.Code)
                return BadRequest("Невірний код.");

            if (user.EmailVerificationCodeExpiry < DateTime.UtcNow)
                return BadRequest("Час дії коду минув. Запросіть новий.");

            user.IsEmailVerified = true;
            user.EmailVerificationCode = null;
            user.EmailVerificationCodeExpiry = null;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Email успішно підтверджено!" });
        }

        private async Task<bool> VerifyCaptchaAsync(string token)
        {
            using var client = new HttpClient();

            var secretKey = "6LcFI3UsAAAAAGkQhHzy-pri_rHxlygZs2wt2hMO";

            var response = await client.PostAsync($"https://www.google.com/recaptcha/api/siteverify?secret={secretKey}&response={token}", null);

            if (response.IsSuccessStatusCode)
            {
                var jsonString = await response.Content.ReadAsStringAsync();
                dynamic jsonData = Newtonsoft.Json.JsonConvert.DeserializeObject(jsonString);
                return jsonData.success == true;
            }

            return false;
        }
    }
}