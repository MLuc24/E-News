// Services/EmailTemplateService.cs
using System;
using Microsoft.AspNetCore.Mvc;

namespace WebBaoDienTu.Services
{
    public class EmailTemplateService
    {
        /// <summary>
        /// Tạo mẫu email xác nhận đăng ký
        /// </summary>
        public static string GetSubscriptionConfirmationTemplate(string email, string unsubscribeUrl)
        {
            return $@"
            <html>
            <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;'>
                    <h2 style='color: #0d6efd;'>Cảm ơn bạn đã đăng ký!</h2>
                    <p>Xin chào,</p>
                    <p>Cảm ơn bạn đã đăng ký nhận tin tức từ <b>Báo Điện Tử</b>. Chúng tôi sẽ gửi những tin tức mới nhất và quan trọng nhất đến hộp thư của bạn.</p>
                    <p>Thông tin đăng ký:</p>
                    <ul>
                        <li><b>Email:</b> {email}</li>
                        <li><b>Thời gian đăng ký:</b> {DateTime.Now:dd/MM/yyyy HH:mm}</li>
                    </ul>
                    <p>Nếu bạn không đăng ký nhận tin này, hoặc muốn hủy đăng ký bất cứ lúc nào, vui lòng nhấp vào nút bên dưới:</p>
                    <p style='text-align: center;'>
                        <a href='{unsubscribeUrl}' style='display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px;'>Hủy đăng ký</a>
                    </p>
                    <hr style='border-top: 1px solid #ddd; margin: 20px 0;'>
                    <p style='font-size: 12px; color: #777;'>© {DateTime.Now.Year} Báo Điện Tử. Tất cả các quyền được bảo lưu.</p>
                </div>
            </body>
            </html>
            ";
        }

        /// <summary>
        /// Tạo mẫu email xác nhận hủy đăng ký
        /// </summary>
        public static string GetUnsubscribeConfirmationTemplate(string email, string subscribeUrl)
        {
            return $@"
            <html>
            <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;'>
                    <h2 style='color: #dc3545;'>Hủy đăng ký thành công</h2>
                    <p>Xin chào,</p>
                    <p>Chúng tôi xác nhận rằng bạn đã hủy đăng ký nhận tin tức từ <b>Báo Điện Tử</b>.</p>
                    <p>Email <b>{email}</b> đã được xóa khỏi danh sách nhận tin của chúng tôi.</p>
                    <p>Chúng tôi rất tiếc khi thấy bạn rời đi. Nếu bạn muốn đăng ký lại trong tương lai, bạn có thể truy cập trang web của chúng tôi hoặc nhấp vào nút bên dưới:</p>
                    <p style='text-align: center;'>
                        <a href='{subscribeUrl}' style='display: inline-block; padding: 10px 20px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 4px;'>Đăng ký lại</a>
                    </p>
                    <hr style='border-top: 1px solid #ddd; margin: 20px 0;'>
                    <p style='font-size: 12px; color: #777;'>© {DateTime.Now.Year} Báo Điện Tử. Tất cả các quyền được bảo lưu.</p>
                </div>
            </body>
            </html>
            ";
        }

        /// <summary>
        /// Tạo mẫu email kiểm tra
        /// </summary>
        public static string GetTestEmailTemplate(string email, DateTime subscribedAt)
        {
            return $@"
            <html>
            <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;'>
                    <h2 style='color: #0d6efd;'>Kiểm tra kết nối email</h2>
                    <p>Xin chào,</p>
                    <p>Đây là email kiểm tra từ <b>Báo Điện Tử</b>.</p>
                    <p>Email này được gửi để xác nhận rằng hệ thống gửi email của chúng tôi đang hoạt động chính xác.</p>
                    <p>Thông tin đăng ký của bạn:</p>
                    <ul>
                        <li><b>Email:</b> {email}</li>
                        <li><b>Thời gian đăng ký:</b> {subscribedAt:dd/MM/yyyy HH:mm}</li>
                        <li><b>Thời gian kiểm tra:</b> {DateTime.Now:dd/MM/yyyy HH:mm:ss}</li>
                    </ul>
                    <p>Cảm ơn bạn đã đăng ký nhận tin tức từ chúng tôi.</p>
                    <hr style='border-top: 1px solid #ddd; margin: 20px 0;'>
                    <p style='font-size: 12px; color: #777;'>© {DateTime.Now.Year} Báo Điện Tử. Tất cả các quyền được bảo lưu.</p>
                </div>
            </body>
            </html>
            ";
        }
    }
}
