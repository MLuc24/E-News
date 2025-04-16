using WebBaoDienTu.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using WebBaoDienTu.Middleware;
using WebBaoDienTu.Services;

var builder = WebApplication.CreateBuilder(args);

// Register HttpClient Factory - Add this line
builder.Services.AddHttpClient();

builder.Services.AddSingleton(provider => {
    var smtpServer = builder.Configuration["EmailSettings:SmtpServer"]
        ?? throw new InvalidOperationException("SMTP Server configuration is missing");
    var smtpPortStr = builder.Configuration["EmailSettings:SmtpPort"]
        ?? throw new InvalidOperationException("SMTP Port configuration is missing");
    var senderEmail = builder.Configuration["EmailSettings:SenderEmail"]
        ?? throw new InvalidOperationException("Sender Email configuration is missing");
    var senderPassword = builder.Configuration["EmailSettings:SenderPassword"]
        ?? throw new InvalidOperationException("Sender Password configuration is missing");

    if (!int.TryParse(smtpPortStr, out int smtpPort))
    {
        throw new InvalidOperationException("Invalid SMTP Port configuration");
    }

    return new EmailService(smtpServer, smtpPort, senderEmail, senderPassword);
});

builder.Services.AddDbContext<BaoDienTuContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Make sure NotificationService is properly registered
builder.Services.AddScoped<NotificationService>();
// Program.cs - Thêm vào phần ConfigureServices
builder.Services.AddScoped<EmailValidationService>();
builder.Services.AddScoped<SubscriptionService>();
builder.Services.AddScoped<SubscriptionDiagnosticService>();

builder.Services.AddRazorPages();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});


builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Account/Login";
        options.LogoutPath = "/Account/Logout";
        options.AccessDeniedPath = "/Account/AccessDenied";
        options.ExpireTimeSpan = TimeSpan.FromMinutes(30);
        options.SlidingExpiration = true;
        options.Cookie.IsEssential = true;
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Strict;
    });

builder.Services.AddControllersWithViews();
builder.Services.AddScoped<EmailValidationService>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseSession();
app.UseRouting();
app.UseAuthentication();
// Thêm middleware kiểm tra phiên
app.UseSessionAuthentication();
app.UseAuthorization();
// Add API endpoint routing before the default route
// Update the existing API route configuration
app.MapControllerRoute(
    name: "api",
    pattern: "api/{controller}/{action}/{id?}");

// Consider adding a more RESTful routing pattern for API controllers
app.MapControllers();

app.MapRazorPages();
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
