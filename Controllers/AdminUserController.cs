using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WebBaoDienTu.Models;

namespace WebBaoDienTu.Controllers
{
    [Authorize(Roles = "Admin")]
    public class AdminUserController : Controller
    {
        private readonly BaoDienTuContext _context;
        private readonly ILogger<AdminUserController> _logger;

        public AdminUserController(BaoDienTuContext context, ILogger<AdminUserController> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<IActionResult> Index(string? fullName, string? email)
        {
            // Query all regular users - including deleted ones to show their status
            var users = _context.Users.Where(u => u.Role == "User");

            if (!string.IsNullOrEmpty(fullName))
            {
                users = users.Where(u => u.FullName.Contains(fullName));
                ViewData["FullNameFilter"] = fullName;
            }

            if (!string.IsNullOrEmpty(email))
            {
                users = users.Where(u => u.Email.Contains(email));
                ViewData["EmailFilter"] = email;
            }
            ViewBag.HideNavElements = true;
            var userList = await users.ToListAsync();
            return View("~/Views/Admin/User/Index.cshtml", userList);
        }


        public async Task<IActionResult> Details(int id)
        {
            try
            {
                var user = await _context.Users.Include(u => u.News).FirstOrDefaultAsync(m => m.UserId == id);
                if (user == null) return NotFound();

                // Only allow viewing details of regular users
                if (user.Role != "User")
                {
                    TempData["ErrorMessage"] = "Bạn chỉ có thể xem chi tiết người dùng thông thường.";
                    return RedirectToAction(nameof(Index));
                }

                // Filter out archived, deleted, and pending news for display
                var approvedNews = user.News.Where(n => n.IsApproved && !n.IsArchived && !n.IsDeleted).ToList();

                ViewBag.TotalNews = user.News.Count;
                ViewBag.ApprovedNews = user.News.Count(n => n.IsApproved);
                ViewBag.PendingNews = user.News.Count(n => !n.IsApproved && !n.IsDeleted && !n.IsArchived);
                ViewBag.HideNavElements = true;

                // Pass only approved news to the view
                ViewBag.ApprovedNewsList = approvedNews;

                return View("~/Views/Admin/User/Details.cshtml", user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Details action for ID: {Id}", id);
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi tải chi tiết người dùng.";
                return RedirectToAction(nameof(Index));
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetUserData(int id)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null) return NotFound();

                // Only allow editing regular users
                if (user.Role != "User")
                {
                    return BadRequest(new { message = "Bạn chỉ có thể chỉnh sửa người dùng thông thường." });
                }

                return Json(new
                {
                    userId = user.UserId,
                    fullName = user.FullName,
                    email = user.Email
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user data for ID: {Id}", id);
                return StatusCode(500, new { message = "Có lỗi xảy ra khi tải thông tin người dùng." });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([FromBody] UserCreateViewModel model)
        {
            try
            {
                if (string.IsNullOrEmpty(model.FullName) || string.IsNullOrEmpty(model.Email) ||
                    string.IsNullOrEmpty(model.Password))
                {
                    return BadRequest(new { message = "Vui lòng điền đủ thông tin." });
                }

                // Validate email format
                if (!IsValidEmail(model.Email))
                {
                    return BadRequest(new { message = "Email không đúng định dạng." });
                }

                // Validate password
                if (model.Password.Length < 6 || model.Password.Length > 8)
                {
                    return BadRequest(new { message = "Mật khẩu phải có 6-8 ký tự." });
                }

                if (!ContainsUpperCase(model.Password))
                {
                    return BadRequest(new { message = "Mật khẩu phải chứa ít nhất một chữ cái in hoa." });
                }

                if (!ContainsLowerCase(model.Password))
                {
                    return BadRequest(new { message = "Mật khẩu phải chứa ít nhất một chữ cái thường." });
                }

                if (!ContainsDigit(model.Password))
                {
                    return BadRequest(new { message = "Mật khẩu phải chứa ít nhất một chữ số." });
                }

                if (await _context.Users.AnyAsync(u => u.Email == model.Email))
                {
                    return BadRequest(new { message = "Email này đã được sử dụng." });
                }

                var user = new User
                {
                    FullName = model.FullName,
                    Email = model.Email,
                    PasswordHash = HashPassword(model.Password),
                    Role = "User",  // Always create regular users
                    CreatedAt = DateTime.Now
                };

                _context.Add(user);
                await _context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    message = "Người dùng đã được tạo thành công.",
                    userId = user.UserId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user: {Message}", ex.Message);
                return StatusCode(500, new { message = "Có lỗi xảy ra khi tạo người dùng." });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit([FromBody] UserEditViewModel model)
        {
            try
            {
                var user = await _context.Users.FindAsync(model.UserId);
                if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

                // Only allow editing regular users
                if (user.Role != "User")
                {
                    return BadRequest(new { message = "Bạn chỉ có thể chỉnh sửa người dùng thông thường." });
                }

                if (string.IsNullOrEmpty(model.FullName))
                {
                    return BadRequest(new { message = "Họ tên không được để trống." });
                }

                if (string.IsNullOrEmpty(model.Email))
                {
                    return BadRequest(new { message = "Email không được để trống." });
                }

                // Validate email format
                if (!IsValidEmail(model.Email))
                {
                    return BadRequest(new { message = "Email không đúng định dạng." });
                }

                user.FullName = model.FullName;

                if (user.Email != model.Email)
                {
                    if (await _context.Users.AnyAsync(u => u.Email == model.Email))
                    {
                        return BadRequest(new { message = "Email này đã được sử dụng." });
                    }
                    user.Email = model.Email;
                }

                if (model.ChangePassword)
                {
                    if (string.IsNullOrEmpty(model.NewPassword))
                    {
                        return BadRequest(new { message = "Vui lòng nhập mật khẩu mới." });
                    }

                    // Validate password
                    if (model.NewPassword.Length < 6 || model.NewPassword.Length > 8)
                    {
                        return BadRequest(new { message = "Mật khẩu phải có 6-8 ký tự." });
                    }

                    if (!ContainsUpperCase(model.NewPassword))
                    {
                        return BadRequest(new { message = "Mật khẩu phải chứa ít nhất một chữ cái in hoa." });
                    }

                    if (!ContainsLowerCase(model.NewPassword))
                    {
                        return BadRequest(new { message = "Mật khẩu phải chứa ít nhất một chữ cái thường." });
                    }

                    if (!ContainsDigit(model.NewPassword))
                    {
                        return BadRequest(new { message = "Mật khẩu phải chứa ít nhất một chữ số." });
                    }

                    // Check if new password is same as old password
                    string newPasswordHash = HashPassword(model.NewPassword);
                    if (newPasswordHash == user.PasswordHash)
                    {
                        return BadRequest(new { message = "Mật khẩu mới không được trùng với mật khẩu cũ." });
                    }

                    user.PasswordHash = newPasswordHash;
                }

                _context.Update(user);
                await _context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    message = "Thông tin người dùng đã được cập nhật."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user with ID: {Id}, Error: {Message}", model.UserId, ex.Message);
                return StatusCode(500, new { message = "Có lỗi xảy ra khi cập nhật người dùng." });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                    return NotFound(new { message = "Không tìm thấy người dùng." });

                // Only allow deleting regular users
                if (user.Role != "User")
                {
                    return BadRequest(new { message = "Bạn chỉ có thể xóa người dùng thông thường." });
                }

                // Get current logged in user ID safely
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var currentUserId))
                {
                    return BadRequest(new { message = "Không thể xác định người dùng hiện tại." });
                }

                // Prevent deleting current logged in user
                if (user.UserId == currentUserId)
                {
                    return BadRequest(new { message = "Bạn không thể xóa tài khoản của chính mình." });
                }

                // Soft delete the user
                user.IsDeleted = true;

                _context.Update(user);
                await _context.SaveChangesAsync();

                return Json(new { success = true, message = "Người dùng đã được xóa thành công." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user with ID: {Id}", id);
                return StatusCode(500, new { message = "Có lỗi xảy ra khi xóa người dùng." });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Restore(int id)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

                // Only allow restoring regular users
                if (user.Role != "User")
                {
                    return BadRequest(new { message = "Bạn chỉ có thể khôi phục người dùng thông thường." });
                }

                // Restore the user
                user.IsDeleted = false;

                _context.Update(user);
                await _context.SaveChangesAsync();

                return Json(new { success = true, message = "Người dùng đã được khôi phục thành công." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error restoring user with ID: {Id}", id);
                return StatusCode(500, new { message = "Có lỗi xảy ra khi khôi phục người dùng." });
            }
        }


        // Helper methods for validation
        private bool IsValidEmail(string email)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }

        private bool ContainsUpperCase(string str)
        {
            return str.Any(char.IsUpper);
        }

        private bool ContainsLowerCase(string str)
        {
            return str.Any(char.IsLower);
        }

        private bool ContainsDigit(string str)
        {
            return str.Any(char.IsDigit);
        }


        public async Task<IActionResult> UserActivity(int id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == id);
            if (user == null) return NotFound();

            // Only allow viewing activity of regular users
            if (user.Role != "User")
            {
                TempData["ErrorMessage"] = "Bạn chỉ có thể xem hoạt động người dùng thông thường.";
                return RedirectToAction(nameof(Index));
            }

            // Get all news for statistics and display
            var allNews = await _context.News
                .Where(n => n.AuthorId == id)
                .Include(n => n.Category)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            ViewBag.User = user;
            ViewBag.HideNavElements = true;
            ViewBag.AllNewsCount = allNews.Count;
            ViewBag.ApprovedNewsCount = allNews.Count(n => n.IsApproved && !n.IsDeleted && !n.IsArchived);
            ViewBag.PendingNewsCount = allNews.Count(n => !n.IsApproved && !n.IsDeleted && !n.IsArchived);
            ViewBag.ArchivedOrDeletedCount = allNews.Count(n => n.IsDeleted || n.IsArchived);

            return View("~/Views/Admin/User/Activity.cshtml", allNews);
        }



        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ResetPassword(int id)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

                // Only allow resetting password for regular users
                if (user.Role != "User")
                {
                    return BadRequest(new { message = "Bạn chỉ có thể đặt lại mật khẩu cho người dùng thông thường." });
                }

                const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                var random = new Random();
                var newPassword = new string(Enumerable.Repeat(chars, 8).Select(s => s[random.Next(s.Length)]).ToArray());

                user.PasswordHash = HashPassword(newPassword);
                _context.Update(user);
                await _context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    message = $"Mật khẩu đã được đặt lại thành công.",
                    newPassword = newPassword
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting password for user with ID: {Id}, Error: {Message}", id, ex.Message);
                return StatusCode(500, new { message = "Có lỗi xảy ra khi đặt lại mật khẩu." });
            }
        }

        private string HashPassword(string password)
        {
            return Convert.ToBase64String(System.Security.Cryptography.SHA256.Create().ComputeHash(System.Text.Encoding.UTF8.GetBytes(password)));
        }
    }

    public class UserCreateViewModel
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UserEditViewModel
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool ChangePassword { get; set; }
        public string? NewPassword { get; set; }
    }
}
