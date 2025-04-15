using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using WebBaoDienTu.Models;
using WebBaoDienTu.ViewModels;

namespace WebBaoDienTu.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommentController : ControllerBase
    {
        private readonly BaoDienTuContext _context;
        private readonly ILogger<CommentController> _logger;

        public CommentController(BaoDienTuContext context, ILogger<CommentController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("news/{newsId}")]
        public async Task<IActionResult> GetComments(int newsId)
        {
            try
            {
                // Check if news exists
                var newsExists = await _context.News.AnyAsync(n => n.NewsId == newsId);
                if (!newsExists)
                    return NotFound(new { message = "Bài viết không tồn tại." });

                // Get all top-level comments (not replies)
                var comments = await _context.Comments
                    .Include(c => c.User)
                    .Include(c => c.Replies.Where(r => !r.IsDeleted))
                        .ThenInclude(r => r.User)
                    .Where(c => c.NewsId == newsId && !c.IsDeleted && c.ParentCommentId == null)
                    .OrderByDescending(c => c.CreatedAt)
                    .Select(c => new
                    {
                        c.CommentId,
                        c.Content,
                        Author = c.User != null ? c.User.FullName : c.GuestName,
                        IsAuthenticated = c.User != null,
                        c.CreatedAt,
                        c.UpdatedAt,
                        Replies = c.Replies.Where(r => !r.IsDeleted).OrderBy(r => r.CreatedAt).Select(r => new
                        {
                            r.CommentId,
                            r.Content,
                            Author = r.User != null ? r.User.FullName : r.GuestName,
                            IsAuthenticated = r.User != null,
                            r.CreatedAt,
                            r.UpdatedAt
                        }).ToList(),
                        ReplyCount = c.Replies.Count(r => !r.IsDeleted)
                    })
                    .ToListAsync();

                return Ok(comments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting comments for news ID {NewsId}", newsId);
                return StatusCode(500, new { message = "Có lỗi xảy ra khi tải bình luận." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> AddComment([FromBody] CommentViewModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                // Validate news exists
                var newsExists = await _context.News.AnyAsync(n => n.NewsId == model.NewsId);
                if (!newsExists)
                    return NotFound(new { success = false, message = "Bài viết không tồn tại." });

                // If there's a parent comment ID, verify it exists
                if (model.ParentCommentId.HasValue)
                {
                    var parentExists = await _context.Comments.AnyAsync(c => c.CommentId == model.ParentCommentId);
                    if (!parentExists)
                        return NotFound(new { success = false, message = "Bình luận gốc không tồn tại." });
                }

                var comment = new Comment
                {
                    Content = model.Content,
                    NewsId = model.NewsId,
                    ParentCommentId = model.ParentCommentId,
                    CreatedAt = DateTime.Now,
                    IsDeleted = false
                };

                // Handle authenticated vs. guest comments
                if (User.Identity.IsAuthenticated)
                {
                    var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                    if (int.TryParse(userIdClaim, out int userId))
                    {
                        comment.UserId = userId;
                    }
                }
                else
                {
                    // For guest comments
                    if (string.IsNullOrEmpty(model.GuestName) || string.IsNullOrEmpty(model.GuestEmail))
                        return BadRequest(new { success = false, message = "Tên và email là bắt buộc cho bình luận của khách." });

                    comment.GuestName = model.GuestName;
                    comment.GuestEmail = model.GuestEmail;
                }

                _context.Comments.Add(comment);
                await _context.SaveChangesAsync();

                // Return data for new comment to display
                var commentData = new
                {
                    comment.CommentId,
                    comment.Content,
                    Author = User.Identity.IsAuthenticated ? User.FindFirstValue("FullName") ?? User.Identity.Name : model.GuestName,
                    IsAuthenticated = User.Identity.IsAuthenticated,
                    comment.CreatedAt,
                    IsReply = comment.ParentCommentId.HasValue,
                    ParentId = comment.ParentCommentId
                };

                return Ok(new { success = true, comment = commentData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding comment");
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi thêm bình luận." });
            }
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateComment(int id, [FromBody] UpdateCommentViewModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var comment = await _context.Comments.FindAsync(id);
                if (comment == null)
                    return NotFound(new { success = false, message = "Không tìm thấy bình luận." });

                // Check if user owns the comment
                var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!int.TryParse(userIdClaim, out int userId) || comment.UserId != userId)
                    return Forbid();

                comment.Content = model.Content;
                comment.UpdatedAt = DateTime.Now;

                _context.Comments.Update(comment);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Bình luận đã được cập nhật." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating comment {CommentId}", id);
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi cập nhật bình luận." });
            }
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteComment(int id)
        {
            try
            {
                var comment = await _context.Comments.FindAsync(id);
                if (comment == null)
                    return NotFound(new { success = false, message = "Không tìm thấy bình luận." });

                // Check if user owns the comment or is admin
                var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var isAdmin = User.IsInRole("Admin");

                if (!isAdmin && (!int.TryParse(userIdClaim, out int userId) || comment.UserId != userId))
                    return Forbid();

                // Soft delete
                comment.IsDeleted = true;
                _context.Comments.Update(comment);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Bình luận đã được xóa." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting comment {CommentId}", id);
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi xóa bình luận." });
            }
        }
    }
}

