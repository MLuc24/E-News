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

namespace WebBaoDienTu.Controllers
{
    public class UserNewsController : Controller
    {
        private readonly BaoDienTuContext _context;
        private readonly ILogger<UserNewsController> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public UserNewsController(
            BaoDienTuContext context,
            ILogger<UserNewsController> logger,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        // GET: UserNews/Create
        [Authorize(Roles = "User")]
        public IActionResult Create()
        {
            // Get categories for the dropdown
            ViewData["CategoryId"] = new SelectList(_context.Categories, "CategoryId", "CategoryName");
            ViewBag.HideNavElements = true;
            return View();
        }

        // POST: UserNews/Create
        [Authorize(Roles = "User")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([Bind("Title,Content,ImageUrl,CategoryId")] News news, IFormFile? ImageFile)
        {
            try
            {
                // Get current user ID
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int authorId))
                {
                    ModelState.AddModelError("", "Không thể xác định người dùng hiện tại.");
                    ViewData["CategoryId"] = new SelectList(_context.Categories, "CategoryId", "CategoryName");
                    return View(news);
                }

                // Set basic properties
                news.AuthorId = authorId;
                news.CreatedAt = DateTime.Now;
                news.IsApproved = false; // User posts need approval
                news.IsDeleted = false;
                news.IsArchived = false;

                // Input validation
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

                // Process image file
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

                // Process image URL
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

                // Save to database
                _context.Add(news);
                await _context.SaveChangesAsync();

                // Return success result
                return Json(new
                {
                    success = true,
                    message = "Tin tức đã được đăng thành công! Vui lòng chờ quản trị viên phê duyệt.",
                    redirectUrl = Url.Action(nameof(MyNews))
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating news");
                return Json(new { success = false, message = "Có lỗi xảy ra khi đăng tin." });
            }
        }

        // GET: UserNews/MyNews
        [Authorize(Roles = "User")]
        public async Task<IActionResult> MyNews()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int authorId))
                    return RedirectToAction("Login", "Account");

                var myNews = await _context.News
                    .Where(n => n.AuthorId == authorId && !n.IsDeleted)
                    .Include(n => n.Category)
                    .OrderByDescending(n => n.CreatedAt)
                    .ToListAsync();

                ViewBag.HideNavElements = true;
                return View("~/Views/User/MyNews.cshtml", myNews);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in MyNews action");
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi tải danh sách tin tức của bạn.";
                return RedirectToAction("Index", "Home");
            }
        }

        // GET: UserNews/UserEdit/5
        [Authorize(Roles = "User")]
        public async Task<IActionResult> Edit(int? id)
        {
            try
            {
                if (id == null)
                    return NotFound();

                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int authorId))
                    return RedirectToAction("Login", "Account");

                var news = await _context.News
                    .FirstOrDefaultAsync(n => n.NewsId == id && n.AuthorId == authorId
                                       && !n.IsApproved && !n.IsArchived);

                if (news == null)
                {
                    TempData["ErrorMessage"] = "Bạn chỉ có thể chỉnh sửa tin đang chờ duyệt.";
                    return RedirectToAction(nameof(MyNews));
                }

                ViewData["IsEdit"] = true;
                ViewBag.HideNavElements = true;
                ViewData["CategoryId"] = new SelectList(_context.Categories, "CategoryId", "CategoryName", news.CategoryId);
                return View("~/Views/Shared/Create.cshtml", news);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Edit GET action for ID: {Id}", id);
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi tải trang chỉnh sửa tin tức.";
                return RedirectToAction(nameof(MyNews));
            }
        }

        // POST: UserNews/Edit/5
        [Authorize(Roles = "User")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, [Bind("NewsId,Title,Content,ImageUrl,AuthorId,CategoryId,IsApproved,CreatedAt,IsDeleted,IsArchived")] News news, IFormFile? ImageFile)
        {
            try
            {
                if (id != news.NewsId)
                    return NotFound();

                _logger.LogInformation("Received data: NewsId={NewsId}, Title='{Title}', AuthorId={AuthorId}, CategoryId={CategoryId}",
                    news.NewsId, news.Title, news.AuthorId, news.CategoryId);

                // Verify that this news belongs to the current user and is pending approval
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int authorId))
                    return RedirectToAction("Login", "Account");

                var existingNews = await _context.News.AsNoTracking()
                    .FirstOrDefaultAsync(n => n.NewsId == id && n.AuthorId == authorId
                                        && !n.IsApproved && !n.IsArchived);

                if (existingNews == null)
                {
                    return Json(new { success = false, message = "Bạn chỉ có thể chỉnh sửa tin đang chờ duyệt." });
                }

                ViewData["IsEdit"] = true;
                ViewData["CategoryId"] = new SelectList(_context.Categories, "CategoryId", "CategoryName", news.CategoryId);

                if (!string.IsNullOrEmpty(news.Title) && !string.IsNullOrEmpty(news.Content) && news.CategoryId > 0)
                {
                    string? originalImageUrl = existingNews.ImageUrl;

                    // Handle image file upload
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
                            return View("Create", news);
                        }
                    }
                    else if (!string.IsNullOrEmpty(news.ImageUrl) && news.ImageUrl != originalImageUrl && !news.ImageUrl.StartsWith("/images/"))
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
                                ModelState.AddModelError("ImageUrl", "Không thể tải ảnh từ URL này. Vui lòng kiểm tra lại URL hoặc tải lên ảnh trực tiếp.");
                                return View("Create", news);
                            }
                        }
                        else
                        {
                            ModelState.AddModelError("ImageUrl", "Không thể tải ảnh từ URL này. Vui lòng kiểm tra lại URL hoặc tải lên ảnh trực tiếp.");
                            return View("Create", news);
                        }
                    }
                    else if (string.IsNullOrEmpty(news.ImageUrl))
                    {
                        // Keep the original image
                        news.ImageUrl = originalImageUrl;
                    }

                    // Set required properties
                    news.AuthorId = authorId;
                    news.IsApproved = false;
                    news.IsArchived = false;
                    news.IsDeleted = false;
                    news.CreatedAt = existingNews.CreatedAt;

                    try
                    {
                        _context.Update(news);
                        await _context.SaveChangesAsync();

                        return Json(new { success = true, message = "Tin tức đã được cập nhật thành công!", redirectUrl = Url.Action(nameof(MyNews)) });
                    }
                    catch (DbUpdateConcurrencyException)
                    {
                        if (!NewsExists(news.NewsId))
                            return NotFound();
                        else
                            throw;
                    }
                }
                else
                {
                    if (string.IsNullOrEmpty(news.Title))
                        ModelState.AddModelError("Title", "Tiêu đề không được để trống.");

                    if (string.IsNullOrEmpty(news.Content))
                        ModelState.AddModelError("Content", "Nội dung không được để trống.");

                    if (news.CategoryId <= 0)
                        ModelState.AddModelError("CategoryId", "Vui lòng chọn danh mục.");

                    TempData["ErrorMessage"] = "Vui lòng điền đầy đủ các trường bắt buộc.";
                    return View("Create", news);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Edit POST action for ID: {Id}", id);
                return Json(new { success = false, message = "Có lỗi xảy ra khi cập nhật tin tức." });
            }
        }

        // GET: UserNews/GetNewsDetailsForDelete/5
        [HttpGet]
        public async Task<IActionResult> GetNewsDetailsForDelete(int id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int authorId))
                    return Json(new { success = false, message = "Không thể xác định người dùng hiện tại." });

                var news = await _context.News
                    .Include(n => n.Author)
                    .Include(n => n.Category)
                    .FirstOrDefaultAsync(m => m.NewsId == id && m.AuthorId == authorId);

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
                return Json(new { success = false, message = "Không thể tải chi tiết tin tức." });
            }
        }

        // GET: UserNews/GetArchivedNewsDetails/5
        [HttpGet]
        public async Task<IActionResult> GetArchivedNewsDetails(int id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int authorId))
                    return Json(new { success = false, message = "Không thể xác định người dùng hiện tại." });

                var news = await _context.News
                    .Include(n => n.Category)
                    .FirstOrDefaultAsync(m => m.NewsId == id && m.AuthorId == authorId);

                if (news == null)
                    return NotFound();

                return Json(new
                {
                    success = true,
                    newsId = news.NewsId,
                    title = news.Title,
                    content = news.Content,
                    imageUrl = news.ImageUrl,
                    categoryName = news.Category.CategoryName,
                    isArchived = news.IsArchived,
                    isExpired = !news.IsApproved && (DateTime.Now - news.CreatedAt).TotalDays > 1
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetArchivedNewsDetails for ID: {Id}", id);
                return Json(new { success = false, message = "Không thể tải chi tiết tin tức." });
            }
        }




        // POST: UserNews/Archive/5
        [Authorize(Roles = "User")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Archive(int id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int authorId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập lại." });
                }

                var newsItem = await _context.News.FirstOrDefaultAsync(n => n.NewsId == id && n.AuthorId == authorId);
                if (newsItem != null && !newsItem.IsApproved)
                {
                    newsItem.IsArchived = true;
                    _context.Update(newsItem);
                    await _context.SaveChangesAsync();
                    return Json(new { success = true, message = "Tin tức đã được lưu trữ thành công." });
                }
                else
                {
                    return Json(new { success = false, message = "Không thể lưu trữ tin tức này." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Archive action for ID: {Id}", id);
                return Json(new { success = false, message = "Có lỗi xảy ra khi lưu trữ tin tức." });
            }
        }

        // POST: UserNews/Delete/5
        [Authorize(Roles = "User")]
        [HttpPost]
        [Route("UserNews/Delete/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int authorId))
                {
                    return Forbid();
                }

                var newsItem = await _context.News.FindAsync(id);
                if (newsItem == null)
                    return Json(new { success = false, message = "Xóa thất bại: Tin tức không tồn tại" });

                if (newsItem.AuthorId != authorId)
                    return Forbid();

                newsItem.IsDeleted = true;
                _context.Update(newsItem);
                await _context.SaveChangesAsync();

                _logger.LogInformation("News marked as deleted by user, ID: {NewsId}", newsItem.NewsId);
                return Json(new { success = true, message = "Xóa thành công" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Delete action for ID: {Id}", id);
                return Json(new { success = false, message = "Có lỗi xảy ra khi xóa tin tức." });
            }
        }

        // POST: UserNews/DeleteConfirmed/5
        [Authorize(Roles = "User")]
        [HttpPost]
        [Route("UserNews/DeleteConfirmed/{id}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int authorId))
                {
                    return Forbid();
                }

                var news = await _context.News.FindAsync(id);
                if (news == null)
                    return Json(new { success = false, message = "Không tìm thấy tin tức" });

                if (news.AuthorId != authorId)
                    return Forbid();

                news.IsDeleted = true;
                _context.Update(news);
                await _context.SaveChangesAsync();

                _logger.LogInformation("News marked as deleted by user, ID: {NewsId}", news.NewsId);
                return Json(new { success = true, message = "Xóa tin tức thành công" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in DeleteConfirmed action for ID: {Id}", id);
                return Json(new { success = false, message = "Có lỗi xảy ra khi xóa tin tức." });
            }
        }

        // POST: UserNews/Repost/5
        [Authorize(Roles = "User")]
        [HttpPost]
        public async Task<IActionResult> Repost(int id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int authorId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập lại." });
                }

                var newsItem = await _context.News.FirstOrDefaultAsync(n => n.NewsId == id && n.AuthorId == authorId);
                if (newsItem != null)
                {
                    newsItem.IsApproved = false;
                    newsItem.IsDeleted = false;
                    newsItem.IsArchived = false;
                    newsItem.CreatedAt = DateTime.Now;

                    _context.Update(newsItem);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("News reposted, ID: {NewsId}", newsItem.NewsId);
                    return Json(new { success = true, message = "Đăng lại thành công" });
                }

                return Json(new { success = false, message = "Đăng lại thất bại: Tin tức không tồn tại hoặc bạn không có quyền." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Repost action for ID: {Id}", id);
                return Json(new { success = false, message = "Có lỗi xảy ra khi đăng lại tin tức." });
            }
        }

        private bool NewsExists(int id)
        {
            return _context.News.Any(e => e.NewsId == id);
        }
    }
}
