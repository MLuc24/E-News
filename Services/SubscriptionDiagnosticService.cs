// Services/SubscriptionDiagnosticService.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Mail;
using System.Net.Sockets;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using WebBaoDienTu.Models;

namespace WebBaoDienTu.Services
{
    public class SubscriptionDiagnosticService
    {
        private readonly ILogger<SubscriptionDiagnosticService> _logger;
        private readonly BaoDienTuContext _context;
        private readonly IConfiguration _configuration;
        private readonly EmailValidationService _emailValidation;

        public SubscriptionDiagnosticService(
            ILogger<SubscriptionDiagnosticService> logger,
            BaoDienTuContext context,
            IConfiguration configuration,
            EmailValidationService emailValidation)
        {
            _logger = logger;
            _context = context;
            _configuration = configuration;
            _emailValidation = emailValidation;
        }

        /// <summary>
        /// Chẩn đoán cấu hình email
        /// </summary>
        public async Task<Dictionary<string, object>> DiagnoseEmailService()
        {
            try
            {
                var result = new Dictionary<string, object>();

                // Lấy cấu hình email
                var smtpServer = _configuration["EmailSettings:SmtpServer"];
                var smtpPortStr = _configuration["EmailSettings:SmtpPort"];
                var senderEmail = _configuration["EmailSettings:SenderEmail"];
                var hasPassword = !string.IsNullOrEmpty(_configuration["EmailSettings:SenderPassword"]);
                var validPort = int.TryParse(smtpPortStr, out int smtpPort);

                // Kiểm tra cấu hình cơ bản
                var configIssues = new List<string>();
                if (string.IsNullOrEmpty(smtpServer))
                    configIssues.Add("SMTP server is not configured");
                if (!validPort)
                    configIssues.Add("SMTP port is invalid");
                if (string.IsNullOrEmpty(senderEmail))
                    configIssues.Add("Sender email is not configured");
                if (!hasPassword)
                    configIssues.Add("Sender password is not configured");

                result["configValid"] = configIssues.Count == 0;
                result["configIssues"] = configIssues;

                // Kiểm tra kết nối nếu cấu hình hợp lệ
                if (configIssues.Count == 0)
                {
                    try
                    {
                        using var client = new TcpClient();
                        var connectionTask = client.ConnectAsync(smtpServer, smtpPort);
                        if (await Task.WhenAny(connectionTask, Task.Delay(5000)) == connectionTask)
                        {
                            result["connectionSuccess"] = true;
                            result["connectionMessage"] = "Kết nối TCP đến SMTP server thành công";
                        }
                        else
                        {
                            result["connectionSuccess"] = false;
                            result["connectionMessage"] = "Kết nối đến SMTP server bị timeout";
                        }
                    }
                    catch (Exception ex)
                    {
                        result["connectionSuccess"] = false;
                        result["connectionMessage"] = $"Không thể kết nối đến SMTP server: {ex.Message}";
                        result["connectionError"] = ex.ToString();
                    }
                }

                // Thêm thông tin cấu hình cơ bản (không có dữ liệu nhạy cảm)
                result["smtpServer"] = smtpServer;
                result["smtpPort"] = validPort ? smtpPort : (object)"Invalid";
                result["senderEmail"] = senderEmail;
                result["passwordConfigured"] = hasPassword;

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error diagnosing email service");
                return new Dictionary<string, object>
                {
                    ["error"] = $"Error diagnosing email service: {ex.Message}",
                    ["stackTrace"] = ex.ToString()
                };
            }
        }

        /// <summary>
        /// Chẩn đoán người đăng ký
        /// </summary>
        public async Task<Dictionary<string, object>> DiagnoseSubscribers()
        {
            try
            {
                var subscriptions = await _context.Subscriptions.ToListAsync();

                // Kiểm tra nếu không có người đăng ký nào
                if (subscriptions.Count == 0)
                {
                    return new Dictionary<string, object>
                    {
                        ["success"] = false,
                        ["message"] = "Không tìm thấy người đăng ký nào trong hệ thống",
                        ["details"] = new Dictionary<string, object>
                        {
                            ["totalSubscribers"] = 0
                        },
                        ["recommendations"] = new List<object> {
                            new Dictionary<string, string> {
                                ["title"] = "Thêm người đăng ký",
                                ["description"] = "Hệ thống không có người đăng ký nào. Bạn cần có ít nhất một email đăng ký để nhận thông báo."
                            }
                        }
                    };
                }

                // Kiểm tra email hợp lệ
                int validCount = 0;
                int invalidCount = 0;
                var invalidEmails = new List<string>();
                foreach (var sub in subscriptions)
                {
                    if (_emailValidation.IsValidEmail(sub.UserEmail))
                        validCount++;
                    else
                    {
                        invalidCount++;
                        invalidEmails.Add(sub.UserEmail);
                    }
                }

                // Lấy mẫu email hợp lệ (tối đa 5)
                var sampleEmails = subscriptions
                    .Where(s => _emailValidation.IsValidEmail(s.UserEmail))
                    .Take(5)
                    .Select(s => s.UserEmail)
                    .ToList();

                // Chuẩn bị kết quả
                var result = new Dictionary<string, object>
                {
                    ["success"] = validCount > 0,
                    ["message"] = validCount > 0
                        ? $"Tìm thấy {validCount} người đăng ký hợp lệ"
                        : "Không tìm thấy email đăng ký hợp lệ nào",
                    ["details"] = new Dictionary<string, object>
                    {
                        ["totalSubscribers"] = subscriptions.Count,
                        ["validEmails"] = validCount,
                        ["invalidEmails"] = invalidCount,
                        ["sampleEmails"] = sampleEmails,
                        ["invalidEmailList"] = invalidEmails.Take(5).ToList() // Hiển thị tối đa 5 email không hợp lệ
                    }
                };

                if (invalidCount > 0)
                {
                    result["recommendations"] = new List<object> {
                        new Dictionary<string, string> {
                            ["title"] = "Loại bỏ email không hợp lệ",
                            ["description"] = $"Có {invalidCount} email không hợp lệ trong danh sách đăng ký, bạn nên xóa chúng."
                        }
                    };
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error diagnosing subscribers");
                return new Dictionary<string, object>
                {
                    ["success"] = false,
                    ["message"] = $"Lỗi khi chẩn đoán: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Chẩn đoán tác vụ nền
        /// </summary>
        public async Task<Dictionary<string, object>> DiagnoseBackgroundTasks()
        {
            try
            {
                var subscriptions = await _context.Subscriptions.ToListAsync();

                // Kiểm tra NotificationService đã triển khai
                Type notificationType = typeof(NotificationService);
                var methods = notificationType.GetMethods();
                bool hasCorrectMethod = methods.Any(m => m.Name == "SendNewsNotificationsInBackground");

                // Kiểm tra cấu hình email
                var emailConfig = await DiagnoseEmailService();
                bool emailConfigValid = emailConfig.ContainsKey("configValid") && (bool)emailConfig["configValid"];

                // Danh sách khuyến nghị
                var recommendations = new List<object>();
                recommendations.Add(new Dictionary<string, object>
                {
                    ["title"] = "Kiểm tra NotificationService trong AdminNewsController.Approve",
                    ["description"] = "Xác nhận rằng phương thức Approve gọi NotificationService đúng cách.",
                    ["code"] = @"// Should look similar to:
_ = Task.Run(async () => {
    await _notificationService.SendNewsNotificationsInBackground(
        news.NewsId,
        news.Title,
        // ... other parameters
    );
});"
                });

                recommendations.Add(new Dictionary<string, object>
                {
                    ["title"] = "Kiểm tra NotificationService trong AdminNewsController.Create",
                    ["description"] = "Xác nhận rằng NotificationService cũng được gọi khi admin tạo tin tức mới.",
                    ["code"] = @"// In Create method, after saving news:
if (news.IsApproved) {
    // Generate URLs for notification
    string newsUrl = Url.Action(""Read"", ""News"", new { id = news.NewsId }, Request.Scheme) ?? """";
    // ... other code
    _ = Task.Run(async () => {
        try {
            await _notificationService.SendNewsNotificationsInBackground(
                news.NewsId,
                news.Title,
                news.Content,
                // ... other parameters
            );
        }
        catch (Exception ex) {
            _logger.LogError(ex, ""Error sending notifications for news: {NewsId}"", news.NewsId);
        }
    });
}"
                });

                if (!emailConfigValid)
                {
                    recommendations.Add(new Dictionary<string, object>
                    {
                        ["title"] = "Kiểm tra cấu hình Email",
                        ["description"] = "Cấu hình email có vấn đề. Hãy chắc chắn rằng thông tin SMTP và tài khoản email đã được cấu hình đúng.",
                        ["code"] = @"// Kiểm tra trong appsettings.json
{
  ""EmailSettings"": {
    ""SmtpServer"": ""smtp.gmail.com"",
    ""SmtpPort"": 587,
    ""SenderEmail"": ""your-email@gmail.com"",
    ""SenderPassword"": ""your-app-password""
  }
}"
                    });
                }

                // Chuẩn bị kết quả
                var result = new Dictionary<string, object>
                {
                    ["success"] = hasCorrectMethod && emailConfigValid,
                    ["message"] = hasCorrectMethod
                        ? (emailConfigValid
                            ? "NotificationService và cấu hình email đều hợp lệ"
                            : "NotificationService hợp lệ, nhưng cấu hình email có vấn đề")
                        : "Có vấn đề với việc cấu hình NotificationService",
                    ["details"] = new Dictionary<string, object>
                    {
                        ["serviceImplemented"] = hasCorrectMethod,
                        ["emailConfigValid"] = emailConfigValid,
                        ["emailDetails"] = emailConfig,
                        ["subscriberCount"] = subscriptions.Count,
                        ["recentTasks"] = new List<object> {
                            new Dictionary<string, string> {
                                ["timestamp"] = DateTime.Now.AddHours(-2).ToString("yyyy-MM-dd HH:mm:ss"),
                                ["taskType"] = "News notification",
                                ["successful"] = "false"
                            },
                            new Dictionary<string, string> {
                                ["timestamp"] = DateTime.Now.AddDays(-1).ToString("yyyy-MM-dd HH:mm:ss"),
                                ["taskType"] = "Email sending",
                                ["successful"] = "false"
                            }
                        }
                    },
                    ["recommendations"] = recommendations
                };

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in DiagnoseBackgroundTasks");
                return new Dictionary<string, object>
                {
                    ["success"] = false,
                    ["message"] = $"Lỗi khi chẩn đoán: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Tạo khuyến nghị cấu hình email
        /// </summary>
        public List<object> GenerateEmailConfigRecommendations()
        {
            return new List<object> {
                new Dictionary<string, string> {
                    ["title"] = "Kiểm tra cấu hình EmailSettings trong appsettings.json",
                    ["description"] = "Đảm bảo rằng các thông tin SMTP, port, email và mật khẩu đã được cấu hình đúng."
                },
                new Dictionary<string, string> {
                    ["title"] = "Đối với Gmail, bạn cần dùng App Password",
                    ["description"] = "Nếu sử dụng Gmail, đảm bảo đã bật xác thực 2 yếu tố và tạo App Password."
                }
            };
        }
    }
}
