using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WebBaoDienTu.Models;
using WebBaoDienTu.ViewModels;

namespace WebBaoDienTu.Controllers
{
    [Authorize]
    public class ProfileController : Controller
    {
        private readonly BaoDienTuContext _context;
        private readonly ILogger<ProfileController> _logger;
        private readonly IWebHostEnvironment _environment;

        public ProfileController(
            BaoDienTuContext context,
            ILogger<ProfileController> logger,
            IWebHostEnvironment environment)
        {
            _context = context;
            _logger = logger;
            _environment = environment;

            // Ensure uploads directory exists
            var uploadsDir = Path.Combine(_environment.WebRootPath, "uploads");
            var avatarsDir = Path.Combine(uploadsDir, "avatars");

            if (!Directory.Exists(uploadsDir))
                Directory.CreateDirectory(uploadsDir);

            if (!Directory.Exists(avatarsDir))
                Directory.CreateDirectory(avatarsDir);
        }

        // GET: Profile
        public async Task<IActionResult> Index()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (!userId.HasValue)
                    return RedirectToAction("Index", "Home");

                var user = await _context.Users
                    .Include(u => u.Profile)
                    .FirstOrDefaultAsync(u => u.UserId == userId.Value);

                ViewBag.HideNavElements = true;
                if (user == null)
                    return NotFound();

                return View(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading profile for user");
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi tải thông tin hồ sơ. Vui lòng thử lại sau.";
                return RedirectToAction("Index", "Home");
            }
        }


        // GET: Profile/Edit
        public async Task<IActionResult> Edit()
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue)
                return RedirectToAction("Index", "Home");  // Changed from Account/Login since that doesn't seem to exist

            try
            {
                var user = await _context.Users
                    .Include(u => u.Profile)
                    .FirstOrDefaultAsync(u => u.UserId == userId.Value);

                if (user == null)
                    return NotFound();

                // Create profile if it doesn't exist
                if (user.Profile == null)
                {
                    user.Profile = new UserProfile
                    {
                        UserId = user.UserId,
                        CreatedAt = DateTime.Now
                    };
                    await _context.SaveChangesAsync();
                }

                var model = new ProfileEditViewModel
                {
                    FullName = user.FullName,
                    PhoneNumber = user.Profile?.PhoneNumber,
                    Address = user.Profile?.Address,
                    DateOfBirth = user.Profile?.DateOfBirth,
                    Bio = user.Profile?.Bio,
                    Gender = user.Profile?.Gender,
                    ExistingAvatar = user.Profile?.AvatarUrl
                };

                return View(model);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading profile for editing: {UserId}", userId);
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi tải thông tin hồ sơ. Vui lòng thử lại sau.";
                return RedirectToAction("Index", "Home");
            }
        }


        // POST: Profile/Edit
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(ProfileEditViewModel model)
        {
            if (!ModelState.IsValid)
                return View(model);

            var userId = GetCurrentUserId();
            if (!userId.HasValue)
                return RedirectToAction("Index", "Home"); // Thay đổi từ Login/Account thành Index/Home

            try
            {
                var user = await _context.Users
                    .Include(u => u.Profile)
                    .FirstOrDefaultAsync(u => u.UserId == userId.Value);

                if (user == null)
                    return NotFound();

                // Update user name
                user.FullName = model.FullName;

                // Create or update profile
                if (user.Profile == null)
                {
                    user.Profile = new UserProfile
                    {
                        UserId = user.UserId,
                        CreatedAt = DateTime.Now
                    };
                    _context.UserProfiles.Add(user.Profile);
                }

                // Update profile fields
                user.Profile.PhoneNumber = model.PhoneNumber;
                user.Profile.Address = model.Address;
                user.Profile.DateOfBirth = model.DateOfBirth;
                user.Profile.Bio = model.Bio;
                user.Profile.Gender = model.Gender;
                user.Profile.UpdatedAt = DateTime.Now;

                // Process avatar upload if provided
                if (model.Avatar != null && model.Avatar.Length > 0)
                {
                    var fileName = await ProcessAvatarUpload(model.Avatar, userId.Value);
                    if (!string.IsNullOrEmpty(fileName))
                        user.Profile.AvatarUrl = fileName;
                }

                await _context.SaveChangesAsync();
                TempData["SuccessMessage"] = "Hồ sơ của bạn đã được cập nhật thành công.";
                return RedirectToAction(nameof(Index));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user profile for user ID: {UserId}", userId);
                ModelState.AddModelError("", "Có lỗi xảy ra khi cập nhật hồ sơ. Vui lòng thử lại sau.");
                return View(model);
            }
        }


        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RemoveAvatar()
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue)
                return Json(new { success = false, message = "Bạn cần đăng nhập để thực hiện chức năng này." });

            try
            {
                var user = await _context.Users
                    .Include(u => u.Profile)
                    .FirstOrDefaultAsync(u => u.UserId == userId.Value);

                if (user?.Profile == null)
                    return Json(new { success = false, message = "Không tìm thấy hồ sơ người dùng." });

                // Delete the physical avatar file if it exists
                if (!string.IsNullOrEmpty(user.Profile.AvatarUrl))
                {
                    var avatarPath = Path.Combine(_environment.WebRootPath, "uploads", "avatars", user.Profile.AvatarUrl);
                    if (System.IO.File.Exists(avatarPath))
                    {
                        System.IO.File.Delete(avatarPath);
                    }
                }

                user.Profile.AvatarUrl = null;
                user.Profile.UpdatedAt = DateTime.Now;
                await _context.SaveChangesAsync();

                // Clear avatar from session
                HttpContext.Session.Remove("UserAvatarUrl");

                return Json(new { success = true, message = "Ảnh đại diện đã được xóa thành công." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing avatar for user ID: {UserId}", userId);
                return Json(new { success = false, message = "Có lỗi xảy ra khi xóa ảnh đại diện." });
            }
        }

        #region Helper methods
        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return null;

            return userId;
        }

        private async Task<string> ProcessAvatarUpload(IFormFile avatar, int userId)
        {
            try
            {
                // Validate file type
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
                var extension = Path.GetExtension(avatar.FileName).ToLowerInvariant();

                if (!allowedExtensions.Contains(extension))
                    throw new Exception("Chỉ chấp nhận file ảnh có định dạng: .jpg, .jpeg, .png, .gif");

                if (avatar.Length > 5 * 1024 * 1024) // 5 MB limit
                    throw new Exception("File ảnh không được vượt quá 5MB");

                // Create directory if it doesn't exist
                var uploadDir = Path.Combine(_environment.WebRootPath, "uploads", "avatars");
                if (!Directory.Exists(uploadDir))
                    Directory.CreateDirectory(uploadDir);

                // Generate a truly unique filename with microsecond precision and a random component
                var uniqueFileName = $"avatar_{userId}_{DateTime.Now.Ticks}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{extension}";
                var filePath = Path.Combine(uploadDir, uniqueFileName);

                // In case the file somehow still exists (extremely unlikely), make sure we get a unique name
                int attempt = 0;
                while (System.IO.File.Exists(filePath) && attempt < 10)
                {
                    uniqueFileName = $"avatar_{userId}_{DateTime.Now.Ticks}_{Guid.NewGuid().ToString("N").Substring(0, 8)}_{attempt}{extension}";
                    filePath = Path.Combine(uploadDir, uniqueFileName);
                    attempt++;
                }

                // Save file using FileStream with Create mode to ensure a new file is created
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await avatar.CopyToAsync(stream);
                }

                return uniqueFileName;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing avatar upload for user ID: {UserId}", userId);
                return null;
            }
        }


        // Thêm các phương thức mới vào ProfileController.cs

        /// <summary>
        /// Updates profile information via AJAX
        /// </summary>
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Update([FromForm] ProfileEditViewModel model)
        {
            if (!ModelState.IsValid)
                return Json(new
                {
                    success = false,
                    errors = ModelState.ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToArray()
                )
                });

            var userId = GetCurrentUserId();
            if (!userId.HasValue)
                return Json(new { success = false, message = "Người dùng không được xác thực." });

            try
            {
                var user = await _context.Users
                    .Include(u => u.Profile)
                    .FirstOrDefaultAsync(u => u.UserId == userId.Value);

                if (user == null)
                    return Json(new { success = false, message = "Không tìm thấy người dùng." });

                // Update user name
                user.FullName = model.FullName;

                // Create or update profile
                if (user.Profile == null)
                {
                    user.Profile = new UserProfile
                    {
                        UserId = user.UserId,
                        CreatedAt = DateTime.Now
                    };
                    _context.UserProfiles.Add(user.Profile);
                }

                // Update profile fields
                user.Profile.PhoneNumber = model.PhoneNumber;
                user.Profile.Address = model.Address;
                user.Profile.DateOfBirth = model.DateOfBirth;
                user.Profile.Bio = model.Bio;
                user.Profile.Gender = model.Gender;
                user.Profile.UpdatedAt = DateTime.Now;

                await _context.SaveChangesAsync();

                // Return updated profile data
                return Json(new
                {
                    success = true,
                    profile = new
                    {
                        fullName = user.FullName,
                        phoneNumber = user.Profile.PhoneNumber,
                        address = user.Profile.Address,
                        dateOfBirth = user.Profile.DateOfBirth,
                        gender = user.Profile.Gender,
                        bio = user.Profile.Bio
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user profile for user ID: {UserId}", userId);
                return Json(new { success = false, message = "Có lỗi xảy ra khi cập nhật hồ sơ." });
            }
        }

        /// <summary>
        /// Updates the user's avatar with cropped image
        /// </summary>
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateAvatar([FromForm] IFormFile Avatar)
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue)
                return Json(new { success = false, message = "Người dùng không được xác thực." });

            if (Avatar == null || Avatar.Length == 0)
                return Json(new { success = false, message = "Không có file ảnh được gửi lên." });

            try
            {
                // Validate file size (max 5MB)
                if (Avatar.Length > 5 * 1024 * 1024)
                {
                    return Json(new { success = false, message = "Kích thước ảnh không được vượt quá 5MB." });
                }

                // Validate file type
                var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif" };
                if (!allowedTypes.Contains(Avatar.ContentType))
                {
                    return Json(new { success = false, message = "Chỉ chấp nhận file ảnh .jpg, .png, .gif." });
                }

                var user = await _context.Users
                    .Include(u => u.Profile)
                    .FirstOrDefaultAsync(u => u.UserId == userId.Value);

                if (user == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy người dùng." });
                }

                // Create profile if it doesn't exist
                if (user.Profile == null)
                {
                    user.Profile = new UserProfile
                    {
                        UserId = user.UserId,
                        CreatedAt = DateTime.Now
                    };
                    _context.UserProfiles.Add(user.Profile);
                }

                // Delete old avatar if it exists
                if (!string.IsNullOrEmpty(user.Profile.AvatarUrl))
                {
                    var oldAvatarPath = Path.Combine(_environment.WebRootPath, "uploads", "avatars", user.Profile.AvatarUrl);
                    if (System.IO.File.Exists(oldAvatarPath))
                    {
                        System.IO.File.Delete(oldAvatarPath);
                    }
                }

                // Save new avatar
                string fileName = await ProcessAvatarUpload(Avatar, userId.Value);
                if (string.IsNullOrEmpty(fileName))
                    return Json(new { success = false, message = "Không thể lưu ảnh đại diện." });

                user.Profile.AvatarUrl = fileName;
                user.Profile.UpdatedAt = DateTime.Now;
                await _context.SaveChangesAsync();

                // Update session for current session
                HttpContext.Session.SetString("UserAvatarUrl", fileName);

                // Return the URL to the avatar
                return Json(new
                {
                    success = true,
                    message = "Cập nhật ảnh đại diện thành công.",
                    avatarUrl = Url.Content($"~/uploads/avatars/{fileName}")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating avatar for user ID: {UserId}", userId);
                return Json(new { success = false, message = "Có lỗi xảy ra khi cập nhật ảnh đại diện." });
            }

        }


        #endregion
    }
}
