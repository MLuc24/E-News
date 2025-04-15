using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WebBaoDienTu.Models;
using WebBaoDienTu.Services;

namespace WebBaoDienTu.Controllers
{
    [Authorize(Roles = "Admin")]
    public class AdminNewsController : Controller
    {
        private readonly BaoDienTuContext _context;
        private readonly ILogger<AdminNewsController> _logger;
        private readonly NotificationService _notificationService;
        private readonly IHttpClientFactory _httpClientFactory;

        public AdminNewsController(
            BaoDienTuContext context,
            ILogger<AdminNewsController> logger,
            NotificationService notificationService,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _logger = logger;
            _notificationService = notificationService;
            _httpClientFactory = httpClientFactory;
        }

        // GET: AdminNews
        [HttpGet]
        public async Task<IActionResult> Index(
            string title,
            string author,
            DateTime? date,
            int? categoryId,
            string approvalStatus,
            DateTime? startDate,
            DateTime? endDate)
        {
            try
            {
                // Convert Categories to SelectListItems for the dropdown
                var categories = await _context.Categories.ToListAsync();
                ViewBag.Categories = categories.Select(c => new SelectListItem
                {
                    Value = c.CategoryId.ToString(),
                    Text = c.CategoryName
                }).ToList();

                ViewBag.HideNavElements = true;

                var query = _context.News
                    .Include(n => n.Author)
                    .Include(n => n.Category)
                    .Where(n => !n.IsDeleted && (!n.IsArchived || n.IsApproved))
                    .AsQueryable();

                // Apply title filter
                if (!string.IsNullOrEmpty(title))
                    query = query.Where(n => n.Title.Contains(title));

                if (!string.IsNullOrEmpty(author))
                    query = query.Where(n => n.Author.FullName.Contains(author));

                if (date.HasValue)
                    query = query.Where(n => n.CreatedAt.Date == date.Value.Date);

                if (categoryId.HasValue && categoryId > 0)
                    query = query.Where(n => n.CategoryId == categoryId.Value);

                if (!string.IsNullOrEmpty(approvalStatus))
                {
                    if (approvalStatus == "approved")
                        query = query.Where(n => n.IsApproved);
                    else if (approvalStatus == "pending")
                        query = query.Where(n => !n.IsApproved);
                }

                if (startDate.HasValue && endDate.HasValue)
                {
                    var endDateAdjusted = endDate.Value.AddDays(1).AddSeconds(-1);
                    query = query.Where(n => n.CreatedAt >= startDate.Value && n.CreatedAt <= endDateAdjusted);
                }

                var newsItems = await query
                    .OrderByDescending(n => !n.IsApproved)
                    .ThenByDescending(n => n.CreatedAt)
                    .ToListAsync();

                ViewData["TitleFilter"] = title;
                ViewData["AuthorFilter"] = author;
                ViewData["DateFilter"] = date?.ToString("yyyy-MM-dd");
                ViewData["CategoryFilter"] = categoryId?.ToString();
                ViewData["ApprovalStatusFilter"] = approvalStatus;
                ViewData["StartDateFilter"] = startDate?.ToString("yyyy-MM-dd");
                ViewData["EndDateFilter"] = endDate?.ToString("yyyy-MM-dd");

                return View("~/Views/Admin/News/Index.cshtml", newsItems);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Index action");
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi tải danh sách tin tức.";
                return View("~/Views/Admin/News/Index.cshtml", new List<News>());
            }
        }

        // GET: AdminNews/GetNewsDetails/5
        public async Task<IActionResult> GetNewsDetails(int id)
        {
            try
            {
                var news = await _context.News
                    .Include(n => n.Author)
                    .Include(n => n.Category)
                    .FirstOrDefaultAsync(m => m.NewsId == id);

                if (news == null)
                    return NotFound();

                return Json(new
                {
                    success = true,
                    newsId = news.NewsId,
                    title = news.Title,
                    content = news.Content,
                    createdAt = news.CreatedAt.ToString("dd/MM/yyyy HH:mm"),
                    authorFullName = news.Author.FullName,
                    imageUrl = news.ImageUrl,
                    categoryName = news.Category.CategoryName,
                    isApproved = news.IsApproved
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNewsDetails for ID: {Id}", id);
                return Json(new { success = false, message = "Không thể tải chi tiết tin tức." });
            }
        }

        // GET: AdminNews/GetNewsDetailsForDelete/5
        public async Task<IActionResult> GetNewsDetailsForDelete(int id)
        {
            try
            {
                var news = await _context.News
                    .Include(n => n.Author)
                    .Include(n => n.Category)
                    .FirstOrDefaultAsync(m => m.NewsId == id);

                if (news == null)
                    return NotFound();

                return Json(new
                {
                    title = news.Title,
                    createdAt = news.CreatedAt.ToString("dd/MM/yyyy HH:mm"),
                    authorFullName = news.Author.FullName,
                    imageUrl = news.ImageUrl,
                    categoryName = news.Category.CategoryName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNewsDetailsForDelete for ID: {Id}", id);
                return Json(new { error = "Không thể tải dữ liệu tin tức." });
            }
        }

        // GET: AdminNews/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            await Task.CompletedTask;
            return RedirectToAction(nameof(Index), new { showDetails = id });
        }

        // GET: AdminNews/Create
        public IActionResult Create()
        {
            // Lấy danh sách danh mục để hiển thị trong dropdown
            ViewData["CategoryId"] = new SelectList(_context.Categories, "CategoryId", "CategoryName");
            ViewBag.HideNavElements = true;
            return View();
        }

        // POST: AdminNews/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([Bind("Title,Content,ImageUrl,CategoryId")] News news, IFormFile? ImageFile)
        {
            try
            {
                // Lấy ID người dùng hiện tại
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int authorId))
                {
                    ModelState.AddModelError("", "Không thể xác định người dùng hiện tại.");
                    ViewData["CategoryId"] = new SelectList(_context.Categories, "CategoryId", "CategoryName");
                    return View(news);
                }

                // Thiết lập các thuộc tính cơ bản cho bài viết
                news.AuthorId = authorId;
                news.CreatedAt = DateTime.Now;
                news.IsApproved = true; // Admin posts are automatically approved
                news.IsDeleted = false;
                news.IsArchived = false;

                // Kiểm tra dữ liệu đầu vào
                if (string.IsNullOrEmpty(news.Title) || string.IsNullOrEmpty(news.Content) || news.CategoryId <= 0)
                {
                    if (string.IsNullOrEmpty(news.Title))
                        ModelState.AddModelError("Title", "Tiêu đề không được để trống.");

                    if (string.IsNullOrEmpty(news.Content))
                        ModelState.AddModelError("Content", "Nội dung không được để trống.");

                    if (news.CategoryId <= 0)
                        ModelState.AddModelError("CategoryId", "Vui lòng chọn danh mục.");

                    ViewData["CategoryId"] = new SelectList(_context.Categories, "CategoryId", "CategoryName");
                    return View(news);
                }

                // Process the image file using NewsImageController
                if (ImageFile != null && ImageFile.Length > 0)
                {
                    using var client = _httpClientFactory.CreateClient();
                    using var content = new MultipartFormDataContent();
                    using var fileContent = new StreamContent(ImageFile.OpenReadStream());
                    content.Add(fileContent, "imageFile", ImageFile.FileName);

                    var response = await client.PostAsync($"{Request.Scheme}://{Request.Host}/api/NewsImage/process", content);
                    if (response.IsSuccessStatusCode)
                    {
                        var responseContent = await response.Content.ReadAsStringAsync();
                        var options = new System.Text.Json.JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        };

                        var result = System.Text.Json.JsonSerializer.Deserialize<ImageProcessingResponse>(responseContent, options);

                        if (result != null && result.Success)
                        {
                            news.ImageUrl = result.ImageUrl;
                        }
                    }
                    else
                    {
                        ModelState.AddModelError("ImageFile", "Có lỗi khi xử lý hình ảnh.");
                        ViewData["CategoryId"] = new SelectList(_context.Categories, "CategoryId", "CategoryName");
                        return View(news);
                    }
                }

                // Handle image URL
                if (!string.IsNullOrEmpty(news.ImageUrl) && (!news.ImageUrl.StartsWith("/images/")))
                {
                    using var client = _httpClientFactory.CreateClient();
                    var response = await client.PostAsJsonAsync($"{Request.Scheme}://{Request.Host}/api/NewsImage/download",
                        new { ImageUrl = news.ImageUrl });

                    if (response.IsSuccessStatusCode)
                    {
                        var responseContent = await response.Content.ReadAsStringAsync();
                        var options = new System.Text.Json.JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        };

                        var result = System.Text.Json.JsonSerializer.Deserialize<ImageProcessingResponse>(responseContent, options);

                        if (result != null && result.Success)
                        {
                            news.ImageUrl = result.ImageUrl;
                        }
                        else
                        {
                            return Json(new
                            {
                                success = false,
                                message = "Không thể tải ảnh từ URL này. Vui lòng kiểm tra lại URL hoặc tải lên ảnh trực tiếp."
                            });
                        }
                    }
                    else
                    {
                        return Json(new
                        {
                            success = false,
                            message = "Không thể tải ảnh từ URL này. Vui lòng kiểm tra lại URL hoặc tải lên ảnh trực tiếp."
                        });
                    }
                }

                _context.Add(news);
                await _context.SaveChangesAsync();

                if (news.IsApproved)
                {
                    // Generate URLs for notification
                    string newsUrl = Url.Action("Read", "News", new { id = news.NewsId }, Request.Scheme) ?? "";
                    string baseUrl = $"{Request.Scheme}://{Request.Host}";
                    string imageFullUrl = news.ImageUrl != null && !news.ImageUrl.StartsWith("http") ?
                        $"{baseUrl}{news.ImageUrl}" : news.ImageUrl ?? "";

                    // Get author and category info
                    var author = await _context.Users.FindAsync(news.AuthorId);
                    var category = await _context.Categories.FindAsync(news.CategoryId);

                    // Generate unsubscribe URLs
                    List<string> unsubscribeUrls = new List<string>();
                    var subscriptions = await _context.Subscriptions.ToListAsync();
                    foreach (var sub in subscriptions)
                    {
                        string? unsubUrl = Url.Action("Unsubscribe", "Subscription", new { email = sub.UserEmail }, Request.Scheme);
                        if (unsubUrl != null)
                        {
                            unsubscribeUrls.Add(unsubUrl);
                        }
                    }

                    // Start background task
                    _ = Task.Run(async () => {
                        try
                        {
                            await _notificationService.SendNewsNotificationsInBackground(
                                news.NewsId,
                                news.Title,
                                news.Content,
                                author?.FullName ?? "Tác giả ẩn danh",
                                category?.CategoryName ?? "Tin tức chung",
                                imageFullUrl,
                                newsUrl,
                                unsubscribeUrls,
                                DateTime.Now
                            );
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error sending notifications for newly created news: {NewsId}", news.NewsId);
                        }
                    });
                }
                return Json(new
                {
                    success = true,
                    message = "Tin tức đã được đăng tải thành công!",
                    redirectUrl = Url.Action(nameof(Index))
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating news");
                return Json(new { success = false, message = "Có lỗi xảy ra khi đăng tin." });
            }
        }

        // POST: AdminNews/Delete/5
        [HttpPost]
        [Route("AdminNews/Delete/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var newsItem = await _context.News.FindAsync(id);
                if (newsItem == null)
                    return Json(new { success = false, message = "Xóa thất bại: Tin tức không tồn tại" });

                // For admin, mark as deleted
                newsItem.IsDeleted = true;
                _context.Update(newsItem);
                await _context.SaveChangesAsync();

                _logger.LogInformation("News marked as deleted by admin, ID: {NewsId}", newsItem.NewsId);
                return Json(new { success = true, message = "Đánh dấu xóa thành công" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Delete action for ID: {Id}", id);
                return Json(new { success = false, message = "Có lỗi xảy ra khi xóa tin tức." });
            }
        }

        // POST: AdminNews/DeleteConfirmed/5
        [HttpPost]
        [Route("AdminNews/DeleteConfirmed/{id}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            try
            {
                var news = await _context.News.FindAsync(id);
                if (news == null)
                    return Json(new { success = false, message = "Không tìm thấy tin tức" });

                // Admin can permanently delete
                _context.News.Remove(news);
                await _context.SaveChangesAsync();

                _logger.LogInformation("News permanently deleted by admin, ID: {NewsId}", news.NewsId);
                return Json(new { success = true, message = "Xóa tin tức thành công" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in DeleteConfirmed action for ID: {Id}", id);
                return Json(new { success = false, message = "Có lỗi xảy ra khi xóa tin tức." });
            }
        }

        // POST: AdminNews/Approve/5
        [HttpPost]
        public async Task<IActionResult> Approve(int id)
        {
            try
            {
                // Get news item with necessary relationships
                var news = await _context.News
                    .Include(n => n.Author)
                    .Include(n => n.Category)
                    .FirstOrDefaultAsync(m => m.NewsId == id);

                if (news == null)
                    return Json(new { success = false, message = "Không tìm thấy tin tức" });

                // Update approval status
                news.IsApproved = true;
                _context.Update(news);
                await _context.SaveChangesAsync();

                _logger.LogInformation("News approved, ID: {NewsId}", news.NewsId);

                // Generate URLs before the background task starts
                string newsUrl = Url.Action("Read", "News", new { id = news.NewsId }, Request.Scheme) ?? "";
                string baseUrl = $"{Request.Scheme}://{Request.Host}";
                string imageFullUrl = news.ImageUrl != null && !news.ImageUrl.StartsWith("http") ?
                    $"{baseUrl}{news.ImageUrl}" : news.ImageUrl ?? "";

                // For unsubscribe links
                List<string> unsubscribeUrls = new List<string>();
                var subscriptions = await _context.Subscriptions.ToListAsync();
                foreach (var sub in subscriptions)
                {
                    string? unsubUrl = Url.Action("Unsubscribe", "Subscription", new { email = sub.UserEmail }, Request.Scheme);
                    if (unsubUrl != null)
                    {
                        unsubscribeUrls.Add(unsubUrl);
                    }
                }

                // Start background task using Task.Run
                _ = Task.Run(async () => {
                    try
                    {
                        await _notificationService.SendNewsNotificationsInBackground(
                            news.NewsId,
                            news.Title,
                            news.Content,
                            news.Author?.FullName ?? "Tác giả ẩn danh",
                            news.Category?.CategoryName ?? "Tin tức chung",
                            imageFullUrl,
                            newsUrl,
                            unsubscribeUrls,
                            DateTime.Now
                        );
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error sending notifications for news: {NewsId}", news.NewsId);
                    }
                });

                return Json(new { success = true, message = "Tin tức đã được duyệt thành công và thông báo đã được gửi đến người đăng ký." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Approve action for ID: {Id}", id);
                return Json(new { success = false, message = "Có lỗi xảy ra khi duyệt tin tức." });
            }
        }

        private bool NewsExists(int id)
        {
            return _context.News.Any(e => e.NewsId == id);
        }
    }

    public class ImageProcessingResponse
    {
        public bool Success { get; set; }
        public string? ImageUrl { get; set; }
        public string? Message { get; set; }
    }
}
