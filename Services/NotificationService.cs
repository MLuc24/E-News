using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using WebBaoDienTu.Models;
using System.Linq;
using System.Text;

namespace WebBaoDienTu.Services
{
    public class NotificationService
    {
        private readonly ILogger<NotificationService> _logger;
        private readonly IServiceScopeFactory _serviceScopeFactory; // Change to IServiceScopeFactory
        private readonly IConfiguration _configuration;
        private int _successCount;
        private int _failedCount;

        public NotificationService(
            ILogger<NotificationService> logger,
            IServiceScopeFactory serviceScopeFactory, // Change parameter type
            IConfiguration configuration)
        {
            _logger = logger;
            _serviceScopeFactory = serviceScopeFactory; // Store the factory instead of provider
            _configuration = configuration;
        }

        /// <summary>
        /// Sends notifications for newly published news to all subscribers
        /// </summary>
        public async Task SendNewsNotificationsInBackground(
            int newsId,
            string title,
            string content,
            string authorName,
            string categoryName,
            string imageUrl,
            string newsUrl,
            List<string> unsubscribeUrls,
            DateTime approvedAt)
        {
            _successCount = 0;
            _failedCount = 0;

            _logger.LogInformation("Starting notification process for NewsId: {NewsId} at {Time}",
                newsId, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));

            try
            {
                // Create a new scope for this background operation
                using var scope = _serviceScopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<BaoDienTuContext>();
                var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

                // Get all subscriptions - with validation
                var subscriptions = await dbContext.Subscriptions.ToListAsync();

                if (subscriptions.Count == 0)
                {
                    _logger.LogWarning("No subscribers found to notify for NewsId: {NewsId}", newsId);
                    return;
                }

                _logger.LogInformation("Found {Count} subscribers to notify for NewsId: {NewsId}",
                    subscriptions.Count, newsId);

                // Subject for the email
                string subject = $"Tin tức mới: {title}";

                // For each subscriber, send notification
                for (int i = 0; i < subscriptions.Count; i++)
                {
                    var subscription = subscriptions[i];

                    // Skip invalid emails
                    if (!IsValidEmail(subscription.UserEmail))
                    {
                        _logger.LogWarning("Skipping invalid email: {Email} for NewsId: {NewsId}",
                            subscription.UserEmail, newsId);
                        _failedCount++;
                        continue;
                    }

                    _logger.LogInformation("Sending notification {Current}/{Total} to {Email} for NewsId: {NewsId}",
                        i + 1, subscriptions.Count, subscription.UserEmail, newsId);

                    string unsubscribeUrl = (i < unsubscribeUrls.Count) ? unsubscribeUrls[i] : "#";

                    try
                    {
                        // Create email body with the news details
                        string body = GenerateNewsEmailBody(
                            title, content, authorName, categoryName,
                            imageUrl, newsUrl, unsubscribeUrl, approvedAt);

                        // Send the email to the subscriber with retry
                        await SendEmailWithRetry(emailService, subscription.UserEmail, subject, body);

                        _successCount++;
                        _logger.LogInformation("News notification sent successfully to {Email} for NewsId: {NewsId}",
                            subscription.UserEmail, newsId);
                    }
                    catch (Exception ex)
                    {
                        _failedCount++;
                        // Log the error but continue with other subscribers
                        _logger.LogError(ex, "Failed to send news notification to {Email} for NewsId: {NewsId}",
                            subscription.UserEmail, newsId);
                    }

                    // Add a small delay to avoid overwhelming the email server
                    await Task.Delay(150);
                }

                _logger.LogInformation("Completed sending notifications for NewsId: {NewsId}. Success: {SuccessCount}, Failed: {FailedCount}",
                    newsId, _successCount, _failedCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SendNewsNotificationsInBackground for NewsId: {NewsId}", newsId);
                throw; // Rethrow to notify caller about the failure
            }
        }

        /// <summary>
        /// Generates an HTML email template for news notifications
        /// </summary>
        private string GenerateNewsEmailBody(
            string title, string content, string authorName,
            string categoryName, string imageUrl, string newsUrl,
            string unsubscribeUrl, DateTime approvedAt)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append(@"
            <html>
            <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;'>
                    <h2 style='color: #0d6efd;'>Tin tức mới từ Báo Điện Tử</h2>
                    <p>Xin chào,</p>
                    <p>Có tin tức mới đã được đăng trên <b>Báo Điện Tử</b> và chúng tôi nghĩ bạn có thể quan tâm:</p>
                    
                    <div style='background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;'>");

            sb.AppendFormat("<h3 style='color: #333; margin-top: 0;'>{0}</h3>", title);
            sb.AppendFormat("<p><strong>Danh mục:</strong> {0}</p>", categoryName);
            sb.AppendFormat("<p><strong>Tác giả:</strong> {0}</p>", authorName);
            sb.AppendFormat("<p><strong>Ngày đăng:</strong> {0}</p>", approvedAt.ToString("dd/MM/yyyy HH:mm"));

            if (!string.IsNullOrEmpty(imageUrl))
            {
                sb.AppendFormat(@"
                    <div style='margin-top: 15px;'>
                        <img src='{0}' style='max-width: 100%; height: auto; border-radius: 5px;' alt='{1}'>
                    </div>", imageUrl, title);
            }

            sb.Append(@"<div style='margin-top: 15px;'>");

            // Content preview with ellipsis if too long
            string contentPreview = content.Length > 200 ? content.Substring(0, 200) + "..." : content;
            sb.AppendFormat("<p>{0}</p>", contentPreview);

            sb.AppendFormat(@"
                    </div>
                    <div style='text-align: center; margin-top: 20px;'>
                        <a href='{0}' style='display: inline-block; padding: 10px 20px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 4px;'>Đọc tiếp</a>
                    </div>
                </div>
                
                <p>Cảm ơn bạn đã đăng ký nhận tin tức từ chúng tôi.</p>
                
                <hr style='border-top: 1px solid #ddd; margin: 20px 0;'>
                <div style='font-size: 12px; color: #777;'>
                    <p>© {1} Báo Điện Tử. Tất cả các quyền được bảo lưu.</p>
                    <p>Nếu không muốn nhận tin tức này nữa, bạn có thể 
                       <a href='{2}' style='color: #0d6efd;'>hủy đăng ký tại đây</a>.</p>
                </div>
            </div>
            </body>
            </html>", newsUrl, DateTime.Now.Year, unsubscribeUrl);

            return sb.ToString();
        }

        /// <summary>
        /// Sends an email with retry attempts
        /// </summary>
        private async Task SendEmailWithRetry(EmailService emailService, string to, string subject, string body)
        {
            const int maxRetries = 2;
            int attempt = 0;
            bool sent = false;

            while (!sent && attempt < maxRetries)
            {
                attempt++;
                try
                {
                    await emailService.SendEmailAsync(to, subject, body);
                    sent = true;
                }
                catch (Exception ex)
                {
                    if (attempt >= maxRetries)
                    {
                        _logger.LogError(ex, "Failed to send email to {Email} after {Attempts} attempts", to, attempt);
                        throw; // Rethrow the exception after max retries
                    }

                    _logger.LogWarning(ex, "Attempt {Attempt}/{MaxRetries} to send email to {Email} failed. Retrying...",
                        attempt, maxRetries, to);

                    // Wait before retrying (exponential backoff)
                    await Task.Delay(attempt * 500);
                }
            }
        }

        /// <summary>
        /// Verifies email format
        /// </summary>
        private bool IsValidEmail(string email)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email && email.Contains(".");
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Gets notification metrics for admin dashboard
        /// </summary>
        public async Task<Dictionary<string, object>> GetNotificationMetrics()
        {
            try
            {
                // Create a new scope for this operation
                using var scope = _serviceScopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<BaoDienTuContext>();

                int totalSubscribers = await dbContext.Subscriptions.CountAsync();

                // Here you would typically get statistics from a notification log table
                // For now we're returning placeholder values

                return new Dictionary<string, object>
                {
                    ["totalSubscribers"] = totalSubscribers,
                    ["lastSentDate"] = DateTime.Now.AddDays(-1),
                    ["lastSuccessCount"] = _successCount,
                    ["lastFailCount"] = _failedCount,
                    ["status"] = totalSubscribers > 0 ? "Active" : "No subscribers"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notification metrics");
                return new Dictionary<string, object>
                {
                    ["error"] = "Không thể tải thống kê thông báo"
                };
            }
        }
    }
}
