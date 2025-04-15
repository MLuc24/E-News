// Controllers/SubscriptionController.cs
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using WebBaoDienTu.Models;
using WebBaoDienTu.Services;

namespace WebBaoDienTu.Controllers
{
    public class SubscriptionController : Controller
    {
        private readonly BaoDienTuContext _context;
        private readonly ILogger<SubscriptionController> _logger;
        private readonly NotificationService _notificationService;
        private readonly EmailValidationService _emailValidation;
        private readonly SubscriptionService _subscriptionService;
        private readonly SubscriptionDiagnosticService _diagnosticService;

        public SubscriptionController(
            BaoDienTuContext context,
            ILogger<SubscriptionController> logger,
            NotificationService notificationService,
            EmailValidationService emailValidation,
            SubscriptionService subscriptionService,
            SubscriptionDiagnosticService diagnosticService)
        {
            _context = context;
            _logger = logger;
            _notificationService = notificationService;
            _emailValidation = emailValidation;
            _subscriptionService = subscriptionService;
            _diagnosticService = diagnosticService;
        }

        #region Public Actions
        /// <summary>
        /// Hiển thị form đăng ký
        /// </summary>
        [HttpGet]
        public IActionResult Subscribe() => View();

        /// <summary>
        /// Xử lý yêu cầu đăng ký email
        /// </summary>
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Subscribe(string email)
        {
            if (string.IsNullOrEmpty(email))
                return Json(new { success = false, message = "Email không được để trống." });

            email = email.Trim().ToLower();

            if (!_emailValidation.IsValidEmail(email))
            {
                _logger.LogWarning("Invalid email format attempted to subscribe: {Email}", email);
                return Json(new { success = false, message = "Địa chỉ email không hợp lệ." });
            }

            try
            {
                // Kiểm tra email tồn tại
                if (!await _emailValidation.VerifyEmailExists(email))
                {
                    _logger.LogWarning("Non-existent email attempted to subscribe: {Email}", email);
                    return Json(new { success = false, message = "Email này không tồn tại. Vui lòng nhập một địa chỉ email hợp lệ." });
                }

                // Kiểm tra email đã tồn tại trong danh sách đăng ký
                if (await _context.Subscriptions.AnyAsync(s => s.UserEmail.ToLower() == email))
                {
                    _logger.LogInformation("Duplicate subscription attempt for email: {Email}", email);
                    return Json(new { success = false, message = "Email này đã được đăng ký trong hệ thống." });
                }

                // Tạo URL hủy đăng ký
                Func<string, string> getUnsubscribeUrl = (email) =>
                {
                    string? url = Url.Action("Unsubscribe", "Subscription", new { email }, Request.Scheme);
                    return url ?? $"{Request.Scheme}://{Request.Host}/Subscription/Unsubscribe?email={Uri.EscapeDataString(email)}";
                };

                // Thêm đăng ký mới
                await _subscriptionService.AddSubscriptionAsync(email, getUnsubscribeUrl);

                return Json(new { success = true, message = "Đăng ký nhận tin tức thành công! Chúng tôi đã gửi email xác nhận đến bạn." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Subscribe action for email: {Email}", email);
                return Json(new { success = false, message = "Có lỗi xảy ra khi đăng ký. Vui lòng thử lại sau." });
            }
        }

        /// <summary>
        /// Hiển thị form hủy đăng ký
        /// </summary>
        [HttpGet]
        public IActionResult Unsubscribe(string email)
        {
            if (!string.IsNullOrEmpty(email))
                ViewData["Email"] = email;

            return View();
        }

        /// <summary>
        /// Xử lý yêu cầu hủy đăng ký
        /// </summary>
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UnsubscribeConfirm(string email)
        {
            if (string.IsNullOrEmpty(email))
                return Json(new { success = false, message = "Email không được để trống." });

            email = email.Trim().ToLower();

            if (!_emailValidation.IsValidEmail(email))
            {
                _logger.LogWarning("Invalid email format attempted to unsubscribe: {Email}", email);
                return Json(new { success = false, message = "Địa chỉ email không hợp lệ." });
            }

            try
            {
                // Kiểm tra email có trong danh sách đăng ký
                var subscription = await _context.Subscriptions.FirstOrDefaultAsync(s => s.UserEmail.ToLower() == email);

                if (subscription == null)
                {
                    _logger.LogInformation("Unsubscribe attempt for non-existent email: {Email}", email);
                    return Json(new { success = false, message = "Email này không tồn tại trong danh sách đăng ký." });
                }

                // Tạo URL đăng ký
                Func<string> getSubscribeUrl = () =>
                {
                    string? url = Url.Action("Subscribe", "Subscription", null, Request.Scheme);
                    return url ?? $"{Request.Scheme}://{Request.Host}/Subscription/Subscribe";
                };

                // Hủy đăng ký
                await _subscriptionService.RemoveSubscriptionAsync(email, getSubscribeUrl);

                return Json(new { success = true, message = "Bạn đã hủy đăng ký thành công." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UnsubscribeConfirm action for email: {Email}", email);
                return Json(new { success = false, message = "Có lỗi xảy ra khi hủy đăng ký. Vui lòng thử lại sau." });
            }
        }

        /// <summary>
        /// Xử lý lỗi không tìm thấy endpoint
        /// </summary>
        [AllowAnonymous]
        [ApiExplorerSettings(IgnoreApi = true)]
        public IActionResult HandleNotFoundError() =>
            NotFound(new { success = false, message = "Endpoint không tồn tại" });
        #endregion

        #region Admin Actions
        /// <summary>
        /// Trang quản lý đăng ký dành cho admin
        /// </summary>
        [Authorize(Roles = "Admin")]
        [Route("Admin/Subscription/ManageSubscriptions")]
        [Route("Admin/Subscription/ManageSubscriptions/{page:int?}")]
        public async Task<IActionResult> ManageSubscriptions(string searchEmail, int page = 1)
        {
            ViewBag.HideNavElements = true;
            const int pageSize = 20;

            try
            {
                var query = _context.Subscriptions.AsQueryable();

                // Áp dụng bộ lọc tìm kiếm nếu được cung cấp - không phân biệt chữ hoa/thường
                if (!string.IsNullOrEmpty(searchEmail))
                {
                    string normalizedSearch = searchEmail.ToLower().Trim();
                    query = query.Where(s => EF.Functions.Like(s.UserEmail.ToLower(), $"%{normalizedSearch}%"));
                    ViewData["SearchEmail"] = searchEmail;
                }

                // Tính tổng số cho phân trang
                var totalCount = await query.CountAsync();
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

                // Lấy dữ liệu trang hiện tại với thứ tự phù hợp
                var subscriptions = await query
                    .OrderByDescending(s => s.SubscribedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                // Thiết lập dữ liệu phân trang
                ViewData["CurrentPage"] = page;
                ViewData["TotalPages"] = totalPages;
                ViewData["TotalCount"] = totalCount;

                // Lấy chỉ số thông báo
                ViewData["NotificationMetrics"] = await _notificationService.GetNotificationMetrics();

                return View("~/Views/Admin/Subscription/ManageSubscriptions.cshtml", subscriptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading ManageSubscriptions page");
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi tải trang quản lý đăng ký.";
                return View("~/Views/Admin/Subscription/ManageSubscriptions.cshtml", new List<Subscription>());
            }
        }

        /// <summary>
        /// Xóa đăng ký (dành cho admin)
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPost]
        [Route("Admin/Subscription/DeleteSubscription/{id:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteSubscription(int id)
        {
            try
            {
                _logger.LogInformation("Delete subscription request received for ID: {Id}", id);

                var subscription = await _context.Subscriptions.FindAsync(id);
                if (subscription == null)
                {
                    _logger.LogWarning("Admin attempted to delete non-existent subscription ID: {Id}", id);
                    return NotFound(new { success = false, message = "Không tìm thấy thông tin đăng ký" });
                }

                string email = subscription.UserEmail;

                using (var transaction = await _context.Database.BeginTransactionAsync())
                {
                    try
                    {
                        _context.Subscriptions.Remove(subscription);
                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();

                        _logger.LogInformation("Subscription deleted by admin: {Email}", email);
                        return Json(new { success = true, message = $"Đã xóa đăng ký email {email} thành công" });
                    }
                    catch (Exception ex)
                    {
                        await transaction.RollbackAsync();
                        _logger.LogError(ex, "Error deleting subscription ID: {Id}", id);
                        return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi xóa đăng ký" });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error deleting subscription ID: {Id}", id);
                return StatusCode(500, new { success = false, message = "Có lỗi không xác định xảy ra khi xóa đăng ký" });
            }
        }

        /// <summary>
        /// Kiểm tra gửi email đến người đăng ký cụ thể
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPost]
        [Route("Admin/Subscription/SendTestEmail")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SendTestEmail(string email)
        {
            if (string.IsNullOrEmpty(email))
                return Json(new { success = false, message = "Email không được để trống." });

            if (!_emailValidation.IsValidEmail(email))
            {
                _logger.LogWarning("Admin attempted to send test email to invalid address: {Email}", email);
                return Json(new { success = false, message = "Địa chỉ email không hợp lệ." });
            }

            try
            {
                // Kiểm tra email đã đăng ký (không phân biệt chữ hoa/thường)
                var subscription = await _context.Subscriptions
                    .FirstOrDefaultAsync(s => s.UserEmail.ToLower() == email.ToLower());

                if (subscription == null)
                {
                    _logger.LogWarning("Admin attempted to send test email to non-subscribed address: {Email}", email);
                    return Json(new { success = false, message = "Email này không có trong danh sách đăng ký." });
                }

                await _subscriptionService.SendTestEmailAsync(email, subscription);
                return Json(new { success = true, message = $"Đã gửi email kiểm tra thành công đến {email}." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending test email to {Email}", email);
                return Json(new { success = false, message = $"Có lỗi xảy ra khi gửi email kiểm tra: {ex.Message}" });
            }
        }

        /// <summary>
        /// Nhập hàng loạt đăng ký (dành cho admin)
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPost]
        [Route("Admin/Subscription/ImportSubscriptions")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ImportSubscriptions(IFormFile csvFile)
        {
            if (csvFile == null || csvFile.Length == 0)
            {
                TempData["ErrorMessage"] = "Vui lòng chọn file CSV để nhập";
                return RedirectToAction(nameof(ManageSubscriptions));
            }

            try
            {
                // Xử lý file CSV
                List<string> validEmails = new List<string>();
                List<string> invalidEmails = new List<string>();
                List<string> duplicateEmails = new List<string>();

                using (var reader = new StreamReader(csvFile.OpenReadStream()))
                {
                    string? line;
                    while ((line = await reader.ReadLineAsync()) != null)
                    {
                        string email = line.Trim().ToLower();

                        // Bỏ qua dòng trống
                        if (string.IsNullOrWhiteSpace(email))
                            continue;

                        // Xác thực cơ bản
                        if (!_emailValidation.IsValidEmail(email))
                        {
                            invalidEmails.Add(email);
                            continue;
                        }

                        // Kiểm tra trùng lặp trong đăng ký hiện tại
                        if (await _context.Subscriptions.AnyAsync(s => s.UserEmail.ToLower() == email))
                        {
                            duplicateEmails.Add(email);
                            continue;
                        }

                        validEmails.Add(email);
                    }
                }

                // Thêm email hợp lệ vào cơ sở dữ liệu
                if (validEmails.Count > 0)
                {
                    await _subscriptionService.BulkImportSubscriptionsAsync(validEmails);
                }

                // Chuẩn bị thông báo kết quả
                string resultMsg = $"Đã nhập {validEmails.Count} địa chỉ email thành công.";
                if (invalidEmails.Count > 0)
                    resultMsg += $" {invalidEmails.Count} địa chỉ không hợp lệ.";
                if (duplicateEmails.Count > 0)
                    resultMsg += $" {duplicateEmails.Count} địa chỉ đã tồn tại.";

                TempData["SuccessMessage"] = resultMsg;
                return RedirectToAction(nameof(ManageSubscriptions));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing subscriptions from CSV");
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi nhập danh sách đăng ký";
                return RedirectToAction(nameof(ManageSubscriptions));
            }
        }

        /// <summary>
        /// Endpoint chẩn đoán cấu hình email
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPost]
        [Route("Admin/Subscription/DiagnoseEmailConfig")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DiagnoseEmailConfig()
        {
            try
            {
                var result = await _diagnosticService.DiagnoseEmailService();
                return Json(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in DiagnoseEmailConfig");
                return Json(new { success = false, message = $"Lỗi khi chẩn đoán: {ex.Message}" });
            }
        }

        /// <summary>
        /// Endpoint chẩn đoán người đăng ký
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPost]
        [Route("Admin/Subscription/DiagnoseSubscribers")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DiagnoseSubscribers()
        {
            try
            {
                var result = await _diagnosticService.DiagnoseSubscribers();
                return Json(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in DiagnoseSubscribers");
                return Json(new { success = false, message = $"Lỗi khi chẩn đoán: {ex.Message}" });
            }
        }

        /// <summary>
        /// Endpoint chẩn đoán cho tác vụ nền
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPost]
        [Route("Admin/Subscription/DiagnoseBackgroundTasks")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DiagnoseBackgroundTasks()
        {
            try
            {
                var result = await _diagnosticService.DiagnoseBackgroundTasks();
                return Json(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in DiagnoseBackgroundTasks");
                return Json(new { success = false, message = $"Lỗi khi chẩn đoán: {ex.Message}" });
            }
        }

        /// <summary>
        /// Kiểm tra kết nối SMTP
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPost]
        [Route("Admin/Subscription/TestSmtpConnection")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> TestSmtpConnection()
        {
            try
            {
                // Lấy dịch vụ email từ DI container
                var emailService = HttpContext.RequestServices.GetRequiredService<EmailService>();

                // Kiểm tra kết nối SMTP
                var (success, message, details) = await emailService.TestSmtpConnection();

                return Json(new
                {
                    success,
                    message,
                    details = string.IsNullOrEmpty(details) ? null : details
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing SMTP connection");
                return Json(new
                {
                    success = false,
                    message = "Lỗi khi kiểm tra kết nối SMTP",
                    error = ex.Message
                });
            }
        }

        #endregion
    }
}
