using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using WebBaoDienTu.Models;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Memory;
using WebBaoDienTu.Services;
using WebBaoDienTu.ViewModels;

namespace WebBaoDienTu.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly BaoDienTuContext _context;
        private readonly ILogger<AuthController> _logger;
        private readonly IMemoryCache _cache;
        private readonly EmailService _emailService;
        private readonly EmailValidationService _emailValidator;
        private const int MaxFailedAttempts = 5;
        private const int LockoutDurationMinutes = 15;
        private const int VerificationCodeExpiryMinutes = 30;
        private const string USER_SESSION_PREFIX = "user_active_session_";

        public AuthController(
            BaoDienTuContext context,
            ILogger<AuthController> logger,
            ITempDataDictionaryFactory tempDataDictionaryFactory,
            IMemoryCache memoryCache,
            EmailValidationService emailValidator,
            EmailService emailService)
        {
            _context = context;
            _logger = logger;
            _cache = memoryCache;
            _emailValidator = emailValidator;
            _emailService = emailService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromForm] LoginViewModel model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });

                // Check if account is locked
                if (await IsAccountLocked(model.Email))
                    return BadRequest(GetAccountLockedResponse(model.Email));

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);

                // If user doesn't exist or password is wrong or account is deleted
                if (user == null || !VerifyPasswordHash(model.Password, user.PasswordHash) || user.IsDeleted)
                {
                    await TrackFailedLoginAttempt(model.Email);
                    return BadRequest(new { success = false, message = "Email hoặc mật khẩu không đúng hoặc tài khoản đã bị xóa." });
                }

                ResetFailedLoginAttempts(model.Email);

                // Tạo sessionId mới cho người dùng
                string newSessionId = Guid.NewGuid().ToString();

                // Kiểm tra xem người dùng đã đăng nhập ở nơi khác chưa
                string userSessionKey = $"{USER_SESSION_PREFIX}{user.UserId}";
                bool hasExistingSession = _cache.TryGetValue(userSessionKey, out string existingSessionId);

                if (hasExistingSession && !string.IsNullOrEmpty(existingSessionId))
                {
                    // Người dùng đã đăng nhập ở nơi khác, vô hiệu hóa phiên đăng nhập đó
                    _logger.LogInformation("Đăng xuất phiên cũ của user {UserId}", user.UserId);
                }

                // Lưu sessionId mới vào cache
                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(model.RememberMe
                        ? TimeSpan.FromDays(30)
                        : TimeSpan.FromHours(12));

                _cache.Set(userSessionKey, newSessionId, cacheOptions);

                // Đăng nhập người dùng với sessionId mới
                await SignInUserAsync(user, model.RememberMe);
                if (user.Profile?.AvatarUrl != null)
                {
                    HttpContext.Session.SetString("UserAvatarUrl", user.Profile.AvatarUrl);
                }
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login: {Message}", ex.Message);
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
            }
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromForm] RegisterViewModel model)
        {
            try
            {
                // Validate registration data
                var validationResult = await ValidateRegistrationData(model);
                if (validationResult != null)
                    return validationResult;

                string normalizedEmail = model.Email.ToLower();

                // Save pending registration to cache
                SavePendingRegistration(normalizedEmail, model);

                // Generate and save verification code
                string verificationCode = GenerateRandomCode();
                await SaveVerificationCode(model.Email, verificationCode);

                // Send verification email
                try
                {
                    await SendVerificationEmail(model.Email, model.FullName, verificationCode);
                    _logger.LogInformation("Email xác nhận đã được gửi đến: {Email}", model.Email);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi khi gửi email xác nhận đến: {Email}", model.Email);
                    return StatusCode(500, new
                    {
                        success = false,
                        message = "Đăng ký thất bại do không thể gửi email xác nhận. Vui lòng thử lại sau."
                    });
                }

                return Ok(new
                {
                    success = true,
                    requiresVerification = true,
                    email = model.Email,
                    message = "Đăng ký thành công! Một mã xác nhận đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến để xác minh tài khoản."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không xác định trong quá trình đăng ký: {Email}", model?.Email);
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra trong quá trình đăng ký: " + ex.Message });
            }
        }

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromForm] EmailVerificationViewModel model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Code))
                    return BadRequest(new { success = false, message = "Email và mã xác nhận không được để trống." });

                // Find the verification code and validate it
                var verification = await GetValidVerificationCode(model.Email, model.Code);
                if (verification == null)
                    return BadRequest(new { success = false, message = "Mã xác nhận không tồn tại, không chính xác hoặc đã hết hạn." });

                // Mark code as used
                verification.IsUsed = true;

                // Process user verification based on whether it's a new registration or existing user
                await ProcessUserVerification(model.Email);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Xác minh email thành công! Bạn có thể đăng nhập vào hệ thống.",
                    redirectToLogin = true
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
            }
        }

        [HttpPost("resend-verification")]
        public async Task<IActionResult> ResendVerification([FromForm] ResendVerificationViewModel model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.Email))
                    return BadRequest(new { success = false, message = "Email không được để trống." });

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email && !u.IsEmailVerified);
                if (user == null)
                    return BadRequest(new { success = false, message = "Không tìm thấy tài khoản cần xác minh." });

                // Check for too many recent verification attempts
                if (await TooManyVerificationAttempts(model.Email))
                    return BadRequest(new
                    {
                        success = false,
                        message = "Bạn đã gửi quá nhiều yêu cầu xác minh. Vui lòng đợi 5 phút và thử lại."
                    });

                // Generate and save new verification code
                string verificationCode = GenerateRandomCode();
                await SaveVerificationCode(model.Email, verificationCode);

                // Send verification email
                await SendVerificationEmail(model.Email, user.FullName, verificationCode);

                return Ok(new
                {
                    success = true,
                    message = "Mã xác nhận mới đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
            }
        }

        [HttpPost("logout")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Logout()
        {
            try
            {
                // Xóa sessionId khỏi cache nếu có
                string userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!string.IsNullOrEmpty(userId))
                {
                    _cache.Remove($"{USER_SESSION_PREFIX}{userId}");
                }

                await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi đăng xuất: " + ex.Message });
            }
        }

        [HttpPost("changePassword")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromForm] ChangePasswordModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Thông tin không hợp lệ." });

            try
            {
                // Get the current user
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int id))
                    return Unauthorized(new { success = false, message = "Bạn cần đăng nhập lại." });

                var user = await _context.Users.FindAsync(id);
                if (user == null)
                    return NotFound(new { success = false, message = "Người dùng không tồn tại." });

                // Validate password change request
                var validationResult = ValidatePasswordChange(user, model);
                if (validationResult != null)
                    return validationResult;

                // Update password
                user.PasswordHash = HashPassword(model.NewPassword);
                _context.Update(user);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Mật khẩu đã được cập nhật thành công." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password for user");
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi thay đổi mật khẩu." });
            }
        }

        [HttpGet("test-email-validation/{email}")]
        public async Task<IActionResult> TestEmailValidation(string email)
        {
            if (string.IsNullOrEmpty(email))
                return BadRequest("Email cannot be empty");

            _logger.LogInformation("Testing email validation for: {Email}", email);
            var result = await _emailValidator.ValidateEmail(email);

            return Ok(new
            {
                email = email,
                isValid = result,
                timestamp = DateTime.Now
            });
        }

        [HttpGet("check-session")]
        [Authorize]
        public IActionResult CheckSessionStatus()
        {
            // Lấy thông tin session hiện tại
            string userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            string sessionId = User.FindFirstValue("SessionId");

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(sessionId))
            {
                return Unauthorized(new
                {
                    success = false,
                    message = "Phiên đăng nhập không hợp lệ",
                    requireLogin = true
                });
            }

            // Kiểm tra xem session ID có khớp với trong cache không
            string userSessionKey = $"{USER_SESSION_PREFIX}{userId}";
            if (_cache.TryGetValue(userSessionKey, out string activeSessionId) && sessionId == activeSessionId)
            {
                return Ok(new { valid = true });
            }

            return Unauthorized(new
            {
                success = false,
                message = "Tài khoản đã được đăng nhập từ thiết bị khác",
                requireLogin = true,
                reason = "concurrent_login"
            });
        }

        [HttpPost("ValidateEmail")]
        public async Task<IActionResult> ValidateEmail([FromBody] EmailValidationViewModel model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model?.Email))
                    return BadRequest(new { exists = false, message = "Email không được để trống" });

                bool isValidEmail = await _emailValidator.ValidateEmail(model.Email);

                return Ok(new
                {
                    exists = isValidEmail,
                    message = isValidEmail ?
                        "Email hợp lệ" :
                        "Email này không tồn tại. Vui lòng nhập một địa chỉ email hợp lệ."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating email: {Email}", model?.Email);
                return StatusCode(500, new { exists = false, message = "Có lỗi xảy ra khi xác thực email" });
            }
        }


        [HttpPost("VerifyEmailExists")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> VerifyEmailExists([FromForm] string email)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(email))
                    return BadRequest(new { exists = false, message = "Email không được để trống" });

                // Use EmailValidationService to check if email exists
                bool isValidEmail = await _emailValidator.ValidateEmail(email);

                return Ok(new
                {
                    exists = isValidEmail,
                    message = isValidEmail ?
                        "Email hợp lệ" :
                        "Email này không tồn tại. Vui lòng nhập một địa chỉ email hợp lệ."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating email existence: {Email}", email);
                return StatusCode(500, new { exists = false, message = "Có lỗi xảy ra khi xác thực email" });
            }
        }



        #region Helper Methods

        private async Task<bool> IsAccountLocked(string email)
        {
            if (string.IsNullOrEmpty(email)) return false;

            string cacheKeyLocked = $"account_locked_{email.ToLower()}";
            if (_cache.TryGetValue(cacheKeyLocked, out DateTime lockedUntil))
            {
                if (DateTime.Now < lockedUntil)
                    return true;
                else
                    _cache.Remove(cacheKeyLocked); // Lock expired
            }

            return false;
        }

        private object GetAccountLockedResponse(string email)
        {
            string cacheKeyLocked = $"account_locked_{email.ToLower()}";
            if (_cache.TryGetValue(cacheKeyLocked, out DateTime lockedUntil))
            {
                TimeSpan remainingTime = lockedUntil - DateTime.Now;
                string remainingMinutes = Math.Ceiling(remainingTime.TotalMinutes).ToString();

                return new
                {
                    success = false,
                    message = $"Tài khoản đã bị tạm khóa. Vui lòng thử lại sau {remainingMinutes} phút.",
                    isLocked = true,
                    remainingMinutes = remainingMinutes
                };
            }

            return new { success = false, message = "Tài khoản đã bị tạm khóa." };
        }

        private async Task TrackFailedLoginAttempt(string email)
        {
            await Task.CompletedTask;
            if (string.IsNullOrEmpty(email)) return;

            string normalizedEmail = email.ToLower();
            string cacheKey = $"failed_attempts_{normalizedEmail}";

            int attempts = 1;
            if (_cache.TryGetValue(cacheKey, out int currentAttempts))
                attempts = currentAttempts + 1;

            _cache.Set(cacheKey, attempts, TimeSpan.FromMinutes(30));
            _logger.LogWarning("Failed login attempt {count} for email: {email}", attempts, email);

            if (attempts >= MaxFailedAttempts)
            {
                DateTime lockUntil = DateTime.Now.AddMinutes(LockoutDurationMinutes);
                _cache.Set($"account_locked_{normalizedEmail}", lockUntil,
                    TimeSpan.FromMinutes(LockoutDurationMinutes + 1));

                _logger.LogWarning("Account locked for email: {email} until {time}", email, lockUntil);
                _cache.Remove(cacheKey);
            }
        }

        private void ResetFailedLoginAttempts(string email)
        {
            if (string.IsNullOrEmpty(email)) return;

            string normalizedEmail = email.ToLower();
            _cache.Remove($"failed_attempts_{normalizedEmail}");
            _cache.Remove($"account_locked_{normalizedEmail}");
        }

        private async Task<IActionResult> ValidateRegistrationData(RegisterViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });
            }

            if (model.Password != model.ConfirmPassword)
            {
                return BadRequest(new { success = false, message = "Mật khẩu xác nhận không khớp." });
            }

            if (model.Password.Length < 6 || model.Password.Length > 8 ||
                !model.Password.Any(char.IsUpper) || !model.Password.Any(char.IsDigit))
            {
                return BadRequest(new { success = false, message = "Mật khẩu phải từ 6-8 ký tự, chứa ít nhất một chữ cái in hoa và một số." });
            }

            if (string.IsNullOrWhiteSpace(model.FullName))
            {
                return BadRequest(new { success = false, message = "Họ tên không được để trống." });
            }

            // Check email format first
            if (!_emailValidator.IsValidEmail(model.Email))
            {
                return BadRequest(new { success = false, message = "Địa chỉ email không đúng định dạng." });
            }

            // Complete email validation
            bool emailValid = await _emailValidator.ValidateEmail(model.Email);
            if (!emailValid)
            {
                return BadRequest(new { success = false, message = "Không thể xác minh địa chỉ email này. Vui lòng sử dụng một địa chỉ email thật." });
            }

            // Check if email already exists in system
            string normalizedEmail = model.Email.ToLower();
            var userExists = await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail && !u.IsDeleted);
            if (userExists)
            {
                return BadRequest(new { success = false, message = "Email đã tồn tại trong hệ thống." });
            }

            return null;
        }



        private void SavePendingRegistration(string normalizedEmail, RegisterViewModel model)
        {
            string registrationKey = $"pending_registration_{normalizedEmail}";
            var pendingRegistration = new PendingRegistration
            {
                Email = model.Email,
                FullName = model.FullName,
                PasswordHash = HashPassword(model.Password),
                CreatedAt = DateTime.Now,
                ExpiresAt = DateTime.Now.AddMinutes(VerificationCodeExpiryMinutes)
            };

            _cache.Set(registrationKey, pendingRegistration, TimeSpan.FromMinutes(VerificationCodeExpiryMinutes));
        }

        private async Task SaveVerificationCode(string email, string code)
        {
            var verification = new VerificationCode
            {
                Email = email,
                Code = code,
                ExpiresAt = DateTime.Now.AddMinutes(VerificationCodeExpiryMinutes),
                CreatedAt = DateTime.Now
            };

            _context.VerificationCodes.Add(verification);
            await _context.SaveChangesAsync();
        }

        private async Task<VerificationCode> GetValidVerificationCode(string email, string code)
        {
            return await _context.VerificationCodes
                .Where(v => v.Email == email && !v.IsUsed && v.ExpiresAt > DateTime.Now && v.Code == code)
                .OrderByDescending(v => v.CreatedAt)
                .FirstOrDefaultAsync();
        }

        private async Task ProcessUserVerification(string email)
        {
            string registrationKey = $"pending_registration_{email.ToLower()}";
            bool isNewRegistration = _cache.TryGetValue(registrationKey, out PendingRegistration pendingRegistration);

            if (isNewRegistration)
            {
                // Create new verified user
                var user = new User
                {
                    Email = pendingRegistration.Email,
                    FullName = pendingRegistration.FullName,
                    PasswordHash = pendingRegistration.PasswordHash,
                    Role = "User",
                    CreatedAt = DateTime.Now,
                    IsEmailVerified = true
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // Create a profile for the user
                var profile = new UserProfile
                {
                    UserId = user.UserId,
                    CreatedAt = DateTime.Now
                };
                _context.UserProfiles.Add(profile);

                _cache.Remove(registrationKey);
            }
            else
            {
                // Update existing user's verification status
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email && !u.IsEmailVerified);
                if (user != null)
                {
                    user.IsEmailVerified = true;

                    // Check if user has a profile, create one if not
                    var hasProfile = await _context.UserProfiles.AnyAsync(p => p.UserId == user.UserId);
                    if (!hasProfile)
                    {
                        var profile = new UserProfile
                        {
                            UserId = user.UserId,
                            CreatedAt = DateTime.Now
                        };
                        _context.UserProfiles.Add(profile);
                    }
                }
            }
        }


        private async Task<bool> TooManyVerificationAttempts(string email)
        {
            var recentAttempts = await _context.VerificationCodes
                .Where(v => v.Email == email && v.CreatedAt > DateTime.Now.AddMinutes(-5))
                .CountAsync();

            return recentAttempts >= 3;
        }

        private IActionResult ValidatePasswordChange(User user, ChangePasswordModel model)
        {
            // Verify current password
            if (user.PasswordHash != HashPassword(model.CurrentPassword))
            {
                return BadRequest(new { success = false, message = "Mật khẩu hiện tại không đúng." });
            }

            // Check if new password is the same as current password
            if (HashPassword(model.NewPassword) == user.PasswordHash)
            {
                return BadRequest(new { success = false, message = "Mật khẩu mới không được trùng với mật khẩu hiện tại." });
            }

            // Validate new password complexity
            var passwordRegex = new System.Text.RegularExpressions.Regex(@"^(?=.*[A-Z])(?=.*\d).{6,8}$");
            if (!passwordRegex.IsMatch(model.NewPassword))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Mật khẩu mới phải từ 6-8 ký tự, chứa ít nhất một chữ cái in hoa và một số."
                });
            }

            // Confirm passwords match
            if (model.NewPassword != model.ConfirmPassword)
            {
                return BadRequest(new { success = false, message = "Xác nhận mật khẩu không khớp." });
            }

            return null;
        }

        private async Task SignInUserAsync(User user, bool isPersistent)
        {
            string displayName = GetFirstName(user.FullName) ?? user.Email.Split('@')[0];

            // Tạo sessionId mới
            string newSessionId = Guid.NewGuid().ToString();

            // Lưu session vào cache
            string userSessionKey = $"user_active_session_{user.UserId}";
            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(isPersistent ? TimeSpan.FromDays(30) : TimeSpan.FromHours(12));
            _cache.Set(userSessionKey, newSessionId, cacheOptions);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Name, user.Email),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("FullName", user.FullName ?? user.Email.Split('@')[0]),
                new Claim("DisplayName", displayName),
                new Claim("SessionId", newSessionId) // Thêm sessionId vào claims
            };

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var principal = new ClaimsPrincipal(identity);

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                principal,
                new AuthenticationProperties
                {
                    IsPersistent = isPersistent,
                    ExpiresUtc = isPersistent ? DateTime.UtcNow.AddDays(30) : null
                });
        }

        private string GenerateRandomCode()
        {
            return new Random().Next(100000, 999999).ToString();
        }

        private async Task SendVerificationEmail(string email, string fullName, string code)
        {
            string subject = "Xác minh email của bạn - Web Báo Điện Tử";
            string body = $@"
                <html>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;'>
                        <h2 style='color: #0d6efd;'>Xác minh Email của bạn</h2>
                        <p>Xin chào <strong>{fullName}</strong>,</p>
                        <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Web Báo Điện Tử</strong>. Để hoàn tất quá trình đăng ký, vui lòng nhập mã xác nhận dưới đây:</p>
                        <div style='background-color: #f7f7f7; padding: 15px; text-align: center; border-radius: 4px; margin: 20px 0;'>
                            <h1 style='font-family: monospace; letter-spacing: 5px; font-size: 32px; margin: 0; color: #333;'>{code}</h1>
                        </div>
                        <p>Mã xác nhận này sẽ hết hạn sau 30 phút.</p>
                        <p>Nếu bạn không yêu cầu tạo tài khoản này, vui lòng bỏ qua email này.</p>
                        <hr style='border-top: 1px solid #ddd; margin: 20px 0;'>
                        <p style='font-size: 12px; color: #777;'>© {DateTime.Now.Year} Web Báo Điện Tử. Tất cả các quyền được bảo lưu.</p>
                    </div>
                </body>
                </html>
            ";

            await _emailService.SendEmailAsync(email, subject, body);
        }

        private string GetFirstName(string fullName)
        {
            if (string.IsNullOrEmpty(fullName))
                return string.Empty;

            var parts = fullName.Trim().Split(' ');
            return parts.Length > 0 ? parts[parts.Length - 1] : fullName;
        }

        private string HashPassword(string password)
        {
            return Convert.ToBase64String(
                System.Security.Cryptography.SHA256.Create()
                .ComputeHash(System.Text.Encoding.UTF8.GetBytes(password)));
        }

        private bool VerifyPasswordHash(string password, string storedHash)
        {
            var hash = HashPassword(password);
            return hash == storedHash;
        }
        #endregion
    }

    // This is the class referenced in the SavePendingRegistration method
    public class PendingRegistration
    {
        public string Email { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string PasswordHash { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}
