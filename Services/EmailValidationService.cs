using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Net.Mail;
using System.Text.Json;
using System.Text.RegularExpressions;

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

                // Try API validation first with higher priority
                string? apiKey = _configuration["EmailVerificationAPI:ApiKey"];
                if (!string.IsNullOrEmpty(apiKey))
                {
                    try
                    {
                        var result = await ValidateEmailWithApi(email, apiKey);
                        if (result.HasValue)
                        {
                            _logger.LogInformation("API validation result for {Email}: {Result}", email, result.Value);
                            return result.Value;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "API email validation failed for {Email}", email);
                    }
                }

                // Fallback to domain and pattern validation
                bool domainExists = await VerifyEmailExists(email);
                if (!domainExists)
                {
                    _logger.LogInformation("Email domain does not exist for {Email}", email);
                    return false;
                }

                bool hasSuspiciousPattern = CheckSuspiciousPattern(email);
                if (hasSuspiciousPattern)
                {
                    _logger.LogInformation("Email has suspicious pattern: {Email}", email);
                    return false;
                }

                // If we made it this far, the email passed all fallback checks
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during email validation: {Email}", email);
                return false;
            }
        }

        private bool CheckSuspiciousPattern(string email)
        {
            string[] emailParts = email.Split('@');
            if (emailParts.Length != 2) return true;

            string username = emailParts[0];
            string domain = emailParts[1];

            // Check for random strings of consonants
            if (HasExcessiveConsecutiveConsonants(username, 5))
                return true;

            // Check for excessive digits
            if (CountDigits(username) > 8)
                return true;

            // Check for random looking patterns (like "asdfgh12345")
            if (Regex.IsMatch(username, @"[a-z]{5,}[0-9]{5,}"))
                return true;

            // Domain-specific checks
            if (domain.ToLower() == "gmail.com")
            {
                // Gmail username rules
                if (username.Length < 6 || username.Length > 30 ||
                    username.Contains("..") ||
                    username.StartsWith(".") || username.EndsWith(".") ||
                    !Regex.IsMatch(username, @"^[a-zA-Z0-9.]+$"))
                    return true;
            }

            return false;
        }

        private bool HasExcessiveConsecutiveConsonants(string text, int threshold)
        {
            var vowels = new[] { 'a', 'e', 'i', 'o', 'u' };
            int consecutive = 0;

            foreach (char c in text.ToLower())
            {
                if (char.IsLetter(c) && !vowels.Contains(c))
                {
                    consecutive++;
                    if (consecutive >= threshold)
                        return true;
                }
                else
                {
                    consecutive = 0;
                }
            }

            return false;
        }

        private int CountDigits(string text)
        {
            return text.Count(char.IsDigit);
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
                {
                    _logger.LogWarning("API returned status code {StatusCode}: {Email}", response.StatusCode, email);
                    return null; // Trigger fallback
                }

                var content = await response.Content.ReadAsStringAsync();
                _logger.LogDebug("API response for {Email}: {Response}", email, content);

                using (JsonDocument doc = JsonDocument.Parse(content))
                {
                    JsonElement root = doc.RootElement;

                    // Extract validation details
                    string deliverability = root.TryGetProperty("deliverability", out JsonElement del) ? del.GetString() ?? "" : "";

                    double qualityScore = 0;
                    if (root.TryGetProperty("quality_score", out JsonElement score))
                    {
                        if (score.ValueKind == JsonValueKind.String)
                        {
                            double.TryParse(score.GetString(), out qualityScore);
                        }
                        else if (score.ValueKind == JsonValueKind.Number)
                        {
                            qualityScore = score.GetDouble();
                        }
                    }

                    bool isValidFormat = root.TryGetProperty("is_valid_format", out JsonElement format) &&
                        format.TryGetProperty("value", out JsonElement formatValue) && formatValue.GetBoolean();

                    bool isMxFound = root.TryGetProperty("is_mx_found", out JsonElement mx) &&
                        mx.TryGetProperty("value", out JsonElement mxValue) && mxValue.GetBoolean();

                    bool isDisposable = root.TryGetProperty("is_disposable", out JsonElement disp) &&
                        disp.TryGetProperty("value", out JsonElement dispValue) && dispValue.GetBoolean();

                    bool isRoleEmail = root.TryGetProperty("is_role_email", out JsonElement role) &&
                        role.TryGetProperty("value", out JsonElement roleValue) && roleValue.GetBoolean();

                    // Logging for troubleshooting
                    _logger.LogInformation(
                        "Email {Email} API check: Deliverability={Deliverability}, Quality={Quality}, " +
                        "ValidFormat={Format}, MxFound={MX}, Disposable={Disposable}, RoleEmail={Role}",
                        email, deliverability, qualityScore, isValidFormat, isMxFound, isDisposable, isRoleEmail);

                    // Strict validation rules
                    if (deliverability == "DELIVERABLE" && qualityScore >= 0.8 && !isDisposable)
                        return true;

                    // Clearly invalid emails
                    if (deliverability == "UNDELIVERABLE" || qualityScore < 0.5 || isDisposable || !isValidFormat || !isMxFound)
                        return false;

                    // For ambiguous results (like UNKNOWN, RISKY), fall back to our other checks
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during API validation: {Email}", email);
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

                // Suspicious keywords check - expanded list
                string[] suspiciousKeywords = { "test", "fake", "random", "temp", "dummy", "user", "admin", "noreply", "example" };
                if (suspiciousKeywords.Any(keyword => username.ToLower().Contains(keyword)))
                    return false;

                // Check for excessive numbers in username
                if (CountDigits(username) > username.Length / 2 && username.Length > 6)
                    return false;

                // Check common domains with stricter validation
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

                        if (!Regex.IsMatch(username, @"^[a-zA-Z0-9.]+$"))
                            return false;

                        if (username.Contains(".."))
                            return false;

                        if (username.StartsWith(".") || username.EndsWith("."))
                            return false;

                        if (HasExcessiveConsecutiveConsonants(username, 5))
                            return false;
                    }

                    // Basic checks for other common providers
                    if (HasExcessiveConsecutiveConsonants(username, 6))
                        return false;

                    // Regex to catch patterns like "asdfgh123456"
                    if (Regex.IsMatch(username, @"[a-z]{5,}[0-9]{5,}"))
                        return false;

                    return true;
                }

                // Non-common domain - more cautious validation
                return username.Length >= 3 && !HasExcessiveConsecutiveConsonants(username, 5);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in fallback email validation: {Email}", email);
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
        /// Kiểm tra xem domain email có tồn tại - used for MX record checking
        /// </summary>
        public async Task<bool> VerifyEmailExists(string email)
        {
            try
            {
                _logger.LogInformation("Verifying if email exists: {Email}", email);

                // Tách domain từ email
                string[] emailParts = email.Split('@');
                if (emailParts.Length != 2 || string.IsNullOrWhiteSpace(emailParts[1]))
                {
                    _logger.LogWarning("Email has invalid format: {Email}", email);
                    return false;
                }

                string domain = emailParts[1];
                string username = emailParts[0];
                _logger.LogInformation("Verifying domain: {Domain}", domain);

                // Check for suspicious or temporary domains
                string[] suspiciousDomains = {
                    "tempmail", "temp-mail", "fakeinbox", "mailinator", "yopmail", "guerrillamail",
                    "dropmail", "throwaway", "mailnesia", "trashmail", "getnada", "spamgourmet"
                };

                if (suspiciousDomains.Any(s => domain.ToLower().Contains(s)))
                {
                    _logger.LogWarning("Suspicious domain detected: {Domain}", domain);
                    return false;
                }

                // Check for obviously fake usernames
                if (CountDigits(username) > 8 || HasExcessiveConsecutiveConsonants(username, 5))
                {
                    _logger.LogWarning("Suspicious username pattern detected: {Username}", username);
                }

                // Perform MX record lookup
                try
                {
                    _logger.LogInformation("Attempting MX lookup for domain: {Domain}", domain);
                    var lookupClient = new DnsClient.LookupClient(new DnsClient.LookupClientOptions
                    {
                        UseCache = true,
                        Timeout = TimeSpan.FromSeconds(5)
                    });

                    var result = await lookupClient.QueryAsync(domain, DnsClient.QueryType.MX);
                    bool hasMxRecords = result.Answers.Count > 0;

                    _logger.LogInformation("MX lookup for {Domain} - Records found: {HasRecords}",
                        domain, hasMxRecords);

                    return hasMxRecords;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "DNS lookup failed for {Domain}, falling back to common domain check", domain);

                    // Fallback to common domain list
                    string[] commonDomains = {
                        "gmail.com", "outlook.com", "hotmail.com", "yahoo.com",
                        "icloud.com", "aol.com", "proton.me", "protonmail.com",
                        "mail.com", "yandex.com", "yandex.ru", "zoho.com",
                        "gmx.com", "tutanota.com"
                    };

                    bool isDomainCommon = commonDomains.Contains(domain.ToLower());
                    _logger.LogInformation("Domain {Domain} is in common domain list: {IsCommon}",
                        domain, isDomainCommon);

                    return isDomainCommon;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error verifying email domain for {Email}", email);
                return false;
            }
        }
    }
}
