using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Net.Mail;
using System.Text.Json;

namespace WebBaoDienTu.Services
{
    public class EmailValidationService
    {
        private readonly ILogger<EmailValidationService> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public EmailValidationService(
            ILogger<EmailValidationService> logger,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<bool> ValidateEmail(string email)
        {
            _logger.LogInformation("Validating email: {Email}", email);

            try
            {
                // Basic format check
                if (string.IsNullOrWhiteSpace(email) || !email.Contains("@") || !email.Contains("."))
                {
                    _logger.LogInformation("Email {Email} has invalid basic format", email);
                    return false;
                }

                // Try API validation first
                string? apiKey = _configuration["EmailVerificationAPI:ApiKey"];
                if (!string.IsNullOrEmpty(apiKey))
                {
                    try
                    {
                        var result = await ValidateEmailWithApi(email, apiKey);
                        if (result.HasValue)
                            return result.Value;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "API email validation failed for {Email}", email);
                    }
                }

                // Fallback to basic validation
                return FallbackEmailValidation(email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during email validation: {Email}", email);
                return FallbackEmailValidation(email);
            }
        }

        private async Task<bool?> ValidateEmailWithApi(string email, string apiKey)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);

                string apiUrl = $"https://emailvalidation.abstractapi.com/v1/?api_key={apiKey}&email={System.Net.WebUtility.UrlEncode(email)}";
                var response = await client.GetAsync(apiUrl);

                if (!response.IsSuccessStatusCode)
                    return null; // Trigger fallback

                var content = await response.Content.ReadAsStringAsync();
                using (JsonDocument doc = JsonDocument.Parse(content))
                {
                    JsonElement root = doc.RootElement;

                    // Extract validation details
                    string deliverability = root.TryGetProperty("deliverability", out JsonElement del) ? del.GetString() ?? "" : "";
                    double qualityScore = root.TryGetProperty("quality_score", out JsonElement score) ?
                        double.TryParse(score.GetString(), out double parsedScore) ? parsedScore : 0 : 0;
                    bool isValidFormat = root.TryGetProperty("is_valid_format", out JsonElement format) &&
                        format.TryGetProperty("value", out JsonElement formatValue) && formatValue.GetBoolean();
                    bool isMxFound = root.TryGetProperty("is_mx_found", out JsonElement mx) &&
                        mx.TryGetProperty("value", out JsonElement mxValue) && mxValue.GetBoolean();

                    // Determine deliverability
                    if (deliverability == "DELIVERABLE" || qualityScore >= 0.7)
                        return true;

                    if (deliverability != "UNDELIVERABLE" && isValidFormat && isMxFound)
                        return true;

                    if (deliverability == "UNDELIVERABLE" || qualityScore < 0.1)
                        return false;
                }

                return null; // Uncertain result, use fallback
            }
            catch
            {
                return null; // Trigger fallback on any exception
            }
        }

        private bool FallbackEmailValidation(string email)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(email))
                    return false;

                var parts = email.Split('@');
                if (parts.Length != 2)
                    return false;

                string username = parts[0];
                string domain = parts[1];

                // Domain format check
                if (!domain.Contains('.') || domain.EndsWith("."))
                    return false;

                // Username length check
                if (username.Length < 3)
                    return false;

                // Suspicious keywords check
                if (username.Contains("test") || username.Contains("fake"))
                    return false;

                // Check common domains
                string[] commonDomains = {
                    "gmail.com", "outlook.com", "hotmail.com", "yahoo.com",
                    "icloud.com", "aol.com", "proton.me", "protonmail.com",
                    "mail.com", "yandex.com", "yandex.ru", "zoho.com",
                    "gmx.com", "tutanota.com"
                };

                if (commonDomains.Contains(domain.ToLower()))
                {
                    // Extra validation for Gmail
                    if (domain.ToLower() == "gmail.com")
                    {
                        if (username.Length < 6 || username.Length > 30)
                            return false;

                        if (!System.Text.RegularExpressions.Regex.IsMatch(username, @"^[a-zA-Z0-9.]+$"))
                            return false;

                        if (username.Contains(".."))
                            return false;

                        if (username.StartsWith(".") || username.EndsWith("."))
                            return false;

                        if (username.Length > 15 &&
                            System.Text.RegularExpressions.Regex.IsMatch(username, @"[a-z]{3,}\d{5,}"))
                            return false;
                    }

                    return true;
                }

                // Non-common domain, just check username length
                return username.Length >= 3;
            }
            catch (Exception)
            {
                return false;
            }
        }

        /// <summary>
        /// Kiểm tra định dạng email
        /// </summary>
        public bool IsValidEmail(string email)
        {
            try
            {
                var addr = new MailAddress(email);
                return addr.Address == email && email.Contains(".");
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Kiểm tra xem domain email có tồn tại
        /// </summary>
        public async Task<bool> VerifyEmailExists(string email)
        {
            try
            {
                // Tách domain từ email
                string[] emailParts = email.Split('@');
                if (emailParts.Length != 2 || string.IsNullOrWhiteSpace(emailParts[1]))
                    return false;

                string domain = emailParts[1];

                // Kiểm tra xem domain có bản ghi MX không (cho biết nó có thể nhận email)
                try
                {
                    var lookupClient = new DnsClient.LookupClient();
                    var result = await lookupClient.QueryAsync(domain, DnsClient.QueryType.MX);
                    return result.Answers.Count > 0;
                }
                catch
                {
                    // Nếu tra cứu DNS thất bại, kiểm tra với danh sách nhà cung cấp email phổ biến
                    string[] commonDomains = {
                        "gmail.com", "outlook.com", "hotmail.com", "yahoo.com",
                        "icloud.com", "aol.com", "proton.me", "protonmail.com",
                        "mail.com", "yandex.com", "yandex.ru", "zoho.com",
                        "gmx.com", "tutanota.com"
                    };
                    return commonDomains.Contains(domain.ToLower());
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying email domain for {Email}", email);
                return false;
            }
        }
    }
}
