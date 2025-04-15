using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Threading.Tasks;
using WebBaoDienTu.Models;
using WebBaoDienTu.Services;

namespace WebBaoDienTu.Controllers
{
    /// <summary>
    /// Controller responsible for handling news sharing functionality in the application.
    /// Provides functionality for users to share news articles via email, manage shared items,
    /// and track notifications of shared content.
    /// </summary>
    public class SharingController : Controller
    {
        private readonly BaoDienTuContext _context;
        private readonly EmailService _emailService;

        /// <summary>
        /// Initializes a new instance of the <see cref="SharingController"/> class.
        /// </summary>
        /// <param name="context">The database context for accessing news and user data.</param>
        /// <param name="emailService">The email service for sending share notifications.</param>
        /// <exception cref="ArgumentNullException">Thrown if context or emailService is null.</exception>
        public SharingController(BaoDienTuContext context, EmailService emailService)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
        }

        // GET: Sharing/Share - Hiển thị form chia sẻ
        [HttpGet]
        public async Task<IActionResult> Share(int id)
        {
            if (id <= 0)
            {
                return NotFound("ID bài viết không hợp lệ.");
            }

            var news = await _context.News.FindAsync(id);
            if (news == null)
            {
                return NotFound("Không tìm thấy bài viết.");
            }

            ViewBag.NewsId = id;
            ViewBag.NewsTitle = news.Title;

            return View();
        }

        // POST: Sharing/Share - Xử lý chia sẻ bài viết
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Share(int newsId, string email, string message)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int senderId))
            {
                TempData["Error"] = "Bạn cần đăng nhập để chia sẻ bài viết.";
                return RedirectToAction("Read", "News", new { id = newsId });
            }

            // Get the current user's email
            var userEmail = User.FindFirstValue(ClaimTypes.Email);

            // Check if the user is trying to share to their own email
            if (email.Equals(userEmail, StringComparison.OrdinalIgnoreCase))
            {
                TempData["Error"] = "Bạn không thể chia sẻ bài viết cho chính mình.";
                return RedirectToAction("Read", "News", new { id = newsId });
            }

            var news = await _context.News
                .Include(n => n.Author)
                .FirstOrDefaultAsync(n => n.NewsId == newsId);

            if (news == null)
            {
                TempData["Error"] = "Bài viết không tồn tại.";
                return RedirectToAction("Read", "News", new { id = newsId });
            }

            var user = await _context.Users.FindAsync(senderId);
            if (user == null)
            {
                TempData["Error"] = "Người dùng không tồn tại.";
                return RedirectToAction("Read", "News", new { id = newsId });
            }

            // Send email with the message
            try
            {
                await _emailService.SendEmailAsync(email, "Chia sẻ bài viết", $"<h3>{news.Title}</h3><p>{news.Content}</p><p><strong>Lời nhắn:</strong> {message}</p>");

                // Create and save NewsSharing entry
                var newsSharing = new NewsSharing
                {
                    NewsId = newsId,
                    UserId = senderId,
                    RecipientEmail = email,
                    ShareDate = DateTime.Now,
                    IsRead = false,
                    News = news,
                    User = user,
                    Message = message // Include the message
                };
                _context.NewsSharing.Add(newsSharing);
                await _context.SaveChangesAsync();

                TempData["Success"] = "Bài viết đã được chia sẻ thành công!";
            }
            catch (Exception)
            {
                TempData["Error"] = "Có lỗi xảy ra khi chia sẻ bài viết.";
            }

            return RedirectToAction("Read", "News", new { id = newsId });
        }

        // GET: Sharing/MyShares - Hiển thị danh sách tin đã chia sẻ
        [Authorize(Roles = "User,Admin")]
        [HttpGet]
        public async Task<IActionResult> MyShares()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                return RedirectToAction("Login", "Account");
            }

            try
            {
                var myShares = await _context.NewsSharing
                    .Include(s => s.News)
                    .Where(s => s.UserId == userId)
                    .OrderByDescending(s => s.ShareDate)
                    .Select(s => new NewsSharing
                    {
                        Id = s.Id,
                        NewsId = s.NewsId,
                        UserId = s.UserId,
                        RecipientEmail = s.RecipientEmail,
                        ShareDate = s.ShareDate,
                        IsRead = s.IsRead,
                        Message = s.Message ?? string.Empty,
                        News = s.News,
                        User = s.User
                    })
                    .ToListAsync();
                ViewBag.HideNavElements = true; // Hide categories and search bar
                return View(myShares);
            }
            catch (Exception ex)
            {
                TempData["Error"] = $"Có lỗi xảy ra khi tải danh sách chia sẻ: {ex.Message}";
                return RedirectToAction("Index", "Home");
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var userEmail = User.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrEmpty(userEmail))
            {
                return Json(new { success = false, message = "Bạn cần đăng nhập để xem thông báo." });
            }

            try
            {
                var notifications = await _context.NewsSharing
                    .Include(s => s.News)
                    .Where(s => s.RecipientEmail == userEmail)
                    .OrderByDescending(s => s.ShareDate)
                    .Select(s => new
                    {
                        s.Id,
                        s.NewsId,
                        Title = s.News.Title ?? string.Empty, // Handle potential null value
                        s.ShareDate,
                        s.IsRead,
                        Message = s.Message ?? string.Empty // Handle potential null value
                    })
                    .ToListAsync();

                return Json(new { success = true, notifications });
            }
            catch (Exception ex)
            {
                // Log the exception
                Console.WriteLine($"Error retrieving notifications: {ex.Message}");
                return Json(new { success = false, message = "Có lỗi xảy ra khi lấy thông báo." });
            }
        }

        // Thêm action để đánh dấu thông báo là đã đọc
        [HttpPost]
        public async Task<IActionResult> MarkAsRead(int notificationId)
        {
            var userEmail = User.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrEmpty(userEmail))
            {
                return Json(new { success = false, message = "Bạn cần đăng nhập." });
            }

            var notification = await _context.NewsSharing
                .FirstOrDefaultAsync(s => s.Id == notificationId && s.RecipientEmail == userEmail);

            if (notification == null)
            {
                return Json(new { success = false, message = "Thông báo không tồn tại." });
            }

            notification.IsRead = true;
            await _context.SaveChangesAsync();

            return Json(new { success = true });
        }

        [HttpGet]
        public async Task<IActionResult> TestNotifications()
        {
            var userEmail = User.FindFirstValue(ClaimTypes.Email);

            var notifications = await _context.NewsSharing
                .Include(s => s.News)
                .Where(s => s.RecipientEmail == userEmail)
                .ToListAsync();

            var result = new
            {
                UserEmail = userEmail,
                NotificationsCount = notifications.Count,
                SampleEmails = await _context.NewsSharing
                    .Select(s => s.RecipientEmail)
                    .Distinct()
                    .Take(5)
                    .ToListAsync()
            };

            return Json(result);
        }
    }
}
