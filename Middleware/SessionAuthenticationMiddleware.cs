using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using System;

namespace WebBaoDienTu.Middleware
{
    public class SessionAuthenticationMiddleware
    {
        private readonly RequestDelegate _next;
        private const string USER_SESSION_PREFIX = "user_active_session_";

        public SessionAuthenticationMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, IMemoryCache cache)
        {
            if (context.User.Identity?.IsAuthenticated == true)
            {
                // Lấy thông tin người dùng từ claims
                string userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
                string sessionId = context.User.FindFirstValue("SessionId");

                if (!string.IsNullOrEmpty(userId))
                {
                    // Kiểm tra phiên hiện tại có khớp với phiên đã lưu không
                    string userSessionKey = $"{USER_SESSION_PREFIX}{userId}";
                    bool sessionValid = false;

                    if (!string.IsNullOrEmpty(sessionId) && cache.TryGetValue(userSessionKey, out string activeSessionId))
                    {
                        sessionValid = sessionId == activeSessionId;
                    }

                    if (!sessionValid)
                    {
                        // Phiên không hợp lệ, đăng xuất người dùng
                        await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

                        // Nếu là request API, trả về thông báo lỗi dạng JSON
                        if (context.Request.Path.StartsWithSegments("/api"))
                        {
                            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                            await context.Response.WriteAsJsonAsync(new
                            {
                                success = false,
                                message = "Tài khoản đã được đăng nhập từ thiết bị khác.",
                                requireLogin = true,
                                reason = "concurrent_login"
                            });
                            return;
                        }

                        // Đối với các request không phải API, chuyển hướng người dùng đến trang đăng nhập với thông báo
                        // Đối với các request không phải API, chuyển hướng người dùng đến trang chủ với thông báo
                        if (!context.Response.HasStarted)
                        {
                            context.Response.Redirect($"/?sessionExpired=true&reason=concurrent_login");
                            return;
                        }
                    }
                }
            }

            await _next(context);
        }
    }

    // Extension method để dễ dàng thêm middleware vào pipeline
    public static class SessionAuthenticationMiddlewareExtensions
    {
        public static IApplicationBuilder UseSessionAuthentication(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<SessionAuthenticationMiddleware>();
        }
    }
}
