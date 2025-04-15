using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;

namespace WebBaoDienTu.Services
{
    public class EmailService
    {
        private readonly string _smtpServer;
        private readonly int _smtpPort;
        private readonly string _senderEmail;
        private readonly string _senderPassword;



        public EmailService(string smtpServer, int smtpPort, string senderEmail, string senderPassword)
        {
            _smtpServer = smtpServer ?? throw new ArgumentNullException(nameof(smtpServer));
            _smtpPort = smtpPort;
            _senderEmail = senderEmail ?? throw new ArgumentNullException(nameof(senderEmail));
            _senderPassword = senderPassword ?? throw new ArgumentNullException(nameof(senderPassword));
        }

        // Add to EmailService.cs
        public async Task SendEmailAsync(string to, string subject, string body)
        {
            try
            {
                var message = new MailMessage
                {
                    From = new MailAddress(_senderEmail),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };

                message.To.Add(to);

                using (var client = new SmtpClient(_smtpServer, _smtpPort))
                {
                    client.EnableSsl = true;
                    client.Credentials = new NetworkCredential(_senderEmail, _senderPassword);
                    client.Timeout = 30000; // 30 seconds timeout

                    Console.WriteLine($"Attempting to send email to {to} via {_smtpServer}:{_smtpPort}");

                    await client.SendMailAsync(message);

                    Console.WriteLine($"Email sent successfully to {to}");
                }
            }
            catch (SmtpException smtpEx)
            {
                Console.WriteLine($"SMTP error: {smtpEx.StatusCode} - {smtpEx.Message}");
                if (smtpEx.InnerException != null)
                    Console.WriteLine($"Inner exception: {smtpEx.InnerException.Message}");
                throw;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Email sending error: {ex.GetType().Name} - {ex.Message}");
                if (ex.InnerException != null)
                    Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                throw;
            }
        }


        // Add this method to EmailService.cs to test the connection:
        /// <summary>
        /// Tests the SMTP connection without sending an email
        /// </summary>
        public async Task<(bool success, string message)> TestConnection()
        {
            try
            {
                using (var client = new SmtpClient(_smtpServer, _smtpPort))
                {
                    client.EnableSsl = true;
                    client.Credentials = new NetworkCredential(_senderEmail, _senderPassword);
                    client.Timeout = 10000; // 10 seconds timeout

                    // Attempt to connect to the SMTP server
                    using (var tcpClient = new System.Net.Sockets.TcpClient())
                    {
                        await tcpClient.ConnectAsync(_smtpServer, _smtpPort);

                        if (tcpClient.Connected)
                        {
                            return (true, $"Successfully connected to {_smtpServer}:{_smtpPort}");
                        }
                        else
                        {
                            return (false, $"Failed to connect to {_smtpServer}:{_smtpPort}");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return (false, $"Connection error: {ex.Message}");
            }
        }



        public async Task<(bool success, string message, string details)> TestSmtpConnection()
        {
            try
            {
                using (var client = new SmtpClient(_smtpServer, _smtpPort))
                {
                    client.EnableSsl = true;
                    client.Credentials = new NetworkCredential(_senderEmail, _senderPassword);
                    client.Timeout = 10000;

                    // Try to connect and authenticate
                    using (var tcpClient = new System.Net.Sockets.TcpClient())
                    {
                        await tcpClient.ConnectAsync(_smtpServer, _smtpPort);

                        if (!tcpClient.Connected)
                            return (false, "Failed to connect to SMTP server", "Could not establish TCP connection");

                        // Additional SMTP handshake tests could be added here

                        return (true, "Successfully connected to SMTP server", "TCP connection established");
                    }
                }
            }
            catch (Exception ex)
            {
                return (false, $"Connection error: {ex.Message}", ex.ToString());
            }
        }

    }
}