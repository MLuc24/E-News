// Services/SubscriptionService.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WebBaoDienTu.Models;

namespace WebBaoDienTu.Services
{
    public class SubscriptionService
    {
        private readonly BaoDienTuContext _context;
        private readonly ILogger<SubscriptionService> _logger;
        private readonly EmailService _emailService;

        public SubscriptionService(
            BaoDienTuContext context,
            ILogger<SubscriptionService> logger,
            EmailService emailService)
        {
            _context = context;
            _logger = logger;
            _emailService = emailService;
        }

        /// <summary>
        /// Thêm đăng ký mới
        /// </summary>
        public async Task AddSubscriptionAsync(string email, Func<string, string> getUnsubscribeUrl)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Thêm email vào bảng Subscriptions
                var subscription = new Subscription
                {
                    UserEmail = email,
                    SubscribedAt = DateTime.Now
                };

                _context.Subscriptions.Add(subscription);
                await _context.SaveChangesAsync();

                // Gửi email xác nhận không đồng bộ
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await SendSubscriptionConfirmationEmail(email, getUnsubscribeUrl(email));
                        _logger.LogInformation("Confirmation email sent successfully to {Email}", email);
                    }
                    catch (Exception emailEx)
                    {
                        _logger.LogError(emailEx, "Failed to send confirmation email to {Email}", email);
                    }
                });

                await transaction.CommitAsync();
                _logger.LogInformation("New subscription added for email: {Email}", email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database error while adding subscription for {Email}", email);
                await transaction.RollbackAsync();
                throw;
            }
        }

        /// <summary>
        /// Xóa đăng ký
        /// </summary>
        public async Task RemoveSubscriptionAsync(string email, string subscribeUrl)
        {
            var subscription = await _context.Subscriptions.FirstOrDefaultAsync(s => s.UserEmail.ToLower() == email.ToLower());

            if (subscription == null)
                throw new InvalidOperationException($"Subscription not found for email: {email}");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Subscriptions.Remove(subscription);
                await _context.SaveChangesAsync();

                // Gửi email xác nhận hủy đăng ký không đồng bộ
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await SendUnsubscribeConfirmationEmail(email, subscribeUrl);
                        _logger.LogInformation("Unsubscribe confirmation email sent to {Email}", email);
                    }
                    catch (Exception emailEx)
                    {
                        _logger.LogError(emailEx, "Failed to send unsubscribe confirmation email to {Email}", email);
                    }
                });

                await transaction.CommitAsync();
                _logger.LogInformation("Subscription removed for email: {Email}", email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database error while removing subscription for {Email}", email);
                await transaction.RollbackAsync();
                throw;
            }
        }


        /// <summary>
        /// Nhập hàng loạt các đăng ký
        /// </summary>
        public async Task BulkImportSubscriptionsAsync(List<string> emails)
        {
            if (emails.Count == 0)
                return;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var email in emails)
                {
                    _context.Subscriptions.Add(new Subscription
                    {
                        UserEmail = email,
                        SubscribedAt = DateTime.Now
                    });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error during bulk subscription import");
                throw;
            }
        }

        /// <summary>
        /// Gửi email xác nhận đăng ký
        /// </summary>
        private async Task SendSubscriptionConfirmationEmail(string email, string unsubscribeUrl)
        {
            string subject = "Xác nhận đăng ký nhận tin tức";
            string body = EmailTemplateService.GetSubscriptionConfirmationTemplate(email, unsubscribeUrl);
            await _emailService.SendEmailAsync(email, subject, body);
        }

        /// <summary>
        /// Gửi email xác nhận hủy đăng ký
        /// </summary>
        private async Task SendUnsubscribeConfirmationEmail(string email, string subscribeUrl)
        {
            string subject = "Xác nhận hủy đăng ký nhận tin";
            string body = EmailTemplateService.GetUnsubscribeConfirmationTemplate(email, subscribeUrl);
            await _emailService.SendEmailAsync(email, subject, body);
        }

        /// <summary>
        /// Gửi email kiểm tra đến người đăng ký
        /// </summary>
        public async Task SendTestEmailAsync(string email, Subscription subscription)
        {
            string subject = "Kiểm tra - Thông báo từ Báo Điện Tử";
            string body = EmailTemplateService.GetTestEmailTemplate(email, subscription.SubscribedAt);
            await _emailService.SendEmailAsync(email, subject, body);
            _logger.LogInformation("Test email sent to {Email}", email);
        }
    }
}
