using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WebBaoDienTu.Models;

namespace WebBaoDienTu.Controllers
{
    public class NewsController : Controller
    {
        private readonly BaoDienTuContext _context;
        private readonly ILogger<NewsController> _logger;

        public NewsController(BaoDienTuContext context, ILogger<NewsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: News/Read/5
        public async Task<IActionResult> Read(int? id)
        {
            try
            {
                ViewBag.Categories = await _context.Categories.ToListAsync();

                if (id == null)
                    return NotFound();

                var news = await _context.News
                    .Include(n => n.Author)
                    .Include(n => n.Category)
                    .FirstOrDefaultAsync(m => m.NewsId == id);

                if (news == null)
                    return NotFound();

                return View(news);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Read action for ID: {Id}", id);
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi tải nội dung tin tức.";
                return RedirectToAction("Index", "Home");
            }
        }

        // GET: News/Category/5
        public async Task<IActionResult> Category(int id)
        {
            try
            {
                ViewBag.Categories = await _context.Categories.ToListAsync();
                var news = await _context.News
                    .Include(n => n.Author)
                    .Include(n => n.Category)
                    .Where(n => n.CategoryId == id && n.IsApproved)
                    .ToListAsync();

                return View("Index", news);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Category action for ID: {Id}", id);
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi tải danh sách tin tức theo danh mục.";
                return RedirectToAction("Index", "Home");
            }
        }

        // GET: News/GetNewsDetails/5
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
        // POST: /News/IncrementReadCount/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> IncrementReadCount(int id, string clientId, string sessionId, int readTimeSeconds = 0)
        {
            try
            {
                var news = await _context.News.FindAsync(id);

                if (news == null)
                    return NotFound(new { success = false, message = "Không tìm thấy bài viết" });

                bool shouldIncrement = true;
                string logMessage = string.Empty;

                // Chỉ thực hiện kiểm tra nếu có clientId
                if (!string.IsNullOrEmpty(clientId))
                {
                    // Kiểm tra thời điểm cuối cùng mà client này đã tăng lượt đọc cho bài viết này
                    string lastIncrementKey = $"LastIncrement_{id}_{clientId}";
                    string lastIncrementValue = HttpContext.Session.GetString(lastIncrementKey);

                    if (!string.IsNullOrEmpty(lastIncrementValue))
                    {
                        // Kiểm tra nếu đã tăng cùng một sessionId
                        if (lastIncrementValue == sessionId)
                        {
                            shouldIncrement = false;
                            logMessage = $"SessionId {sessionId} đã được sử dụng để tăng lượt đọc trước đó";
                        }
                        else if (DateTime.TryParse(lastIncrementValue.Split('|')[0], out DateTime lastTime))
                        {
                            // Nếu đã tăng lượt đọc cho bài này trong vòng 30 giây
                            TimeSpan timeSinceLastIncrement = DateTime.Now - lastTime;
                            if (timeSinceLastIncrement.TotalSeconds < 30)
                            {
                                shouldIncrement = false;
                                logMessage = $"Thời gian từ lần tăng lượt đọc cuối ({timeSinceLastIncrement.TotalSeconds}s) chưa đủ 30s";
                            }
                        }
                    }

                    if (shouldIncrement)
                    {
                        // Lưu thông tin thời điểm tăng lượt đọc này vào session
                        string incrementInfo = $"{DateTime.Now:o}|{sessionId}";
                        HttpContext.Session.SetString(lastIncrementKey, incrementInfo);
                    }
                }

                if (shouldIncrement)
                {
                    // Tăng lượt đọc
                    news.ReadCount++;

                    // Lưu thay đổi vào database
                    await _context.SaveChangesAsync();

                    _logger.LogInformation($"Tăng lượt đọc cho bài viết {id}, clientId: {clientId}, sessionId: {sessionId}, readTime: {readTimeSeconds}s");
                }
                else
                {
                    _logger.LogInformation($"Không tăng lượt đọc: {logMessage}");
                }

                return Json(new { success = true, newCount = news.ReadCount });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tăng lượt đọc cho bài viết ID: {Id}", id);
                return Json(new { success = false, message = "Không thể cập nhật lượt đọc" });
            }
        }


        // Phương thức ValidateReadRequest không được sử dụng nữa, có thể xóa hoặc giữ lại
    }
}
