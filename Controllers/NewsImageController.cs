using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace WebBaoDienTu.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NewsImageController : ControllerBase
    {
        private readonly ILogger<NewsImageController> _logger;

        public NewsImageController(ILogger<NewsImageController> logger)
        {
            _logger = logger;
        }

        [HttpPost("process")]
        public async Task<IActionResult> ProcessImage(IFormFile imageFile)
        {
            try
            {
                string? imageUrl = await ProcessUploadedImage(imageFile);
                if (!string.IsNullOrEmpty(imageUrl))
                {
                    return Ok(new { Success = true, ImageUrl = imageUrl }); // Match property names
                }
                return BadRequest(new { Success = false, Message = "Có lỗi khi xử lý hình ảnh." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ProcessImage");
                return StatusCode(500, new { Success = false, Message = "Có lỗi server khi xử lý hình ảnh." });
            }
        }

        [HttpPost("download")]
        public async Task<IActionResult> DownloadImage([FromBody] DownloadImageRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.ImageUrl))
            {
                return BadRequest(new { success = false, message = "URL hình ảnh không hợp lệ." });
            }

            try
            {
                string? imageUrl = await DownloadAndSaveImageFromUrl(request.ImageUrl);
                if (!string.IsNullOrEmpty(imageUrl))
                {
                    return Ok(new { success = true, imageUrl });
                }
                return BadRequest(new { success = false, message = "Không thể tải ảnh từ URL này." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in DownloadImage");
                return StatusCode(500, new { success = false, message = "Có lỗi server khi tải hình ảnh." });
            }
        }

        public class DownloadImageRequest
        {
            public string ImageUrl { get; set; } = string.Empty;
        }

        #region Helper Methods
        private async Task<string?> ProcessUploadedImage(IFormFile? imageFile)
        {
            if (imageFile == null || imageFile.Length == 0)
            {
                return null;
            }

            try
            {
                string fileExtension = Path.GetExtension(imageFile.FileName).ToLower();
                string[] allowedExtensions = { ".jpg", ".jpeg", ".png", ".gif" };

                if (!allowedExtensions.Contains(fileExtension))
                {
                    _logger.LogWarning("Invalid file extension: {Extension}", fileExtension);
                    return null;
                }

                string uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/images");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                string uniqueFileName = Guid.NewGuid().ToString() + fileExtension;
                string filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await imageFile.CopyToAsync(fileStream);
                }

                return "/images/" + uniqueFileName;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing image upload");
                return null;
            }
        }

        private async Task<string?> DownloadAndSaveImageFromUrl(string? imageUrl)
        {
            if (string.IsNullOrEmpty(imageUrl))
            {
                return null;
            }

            try
            {
                // Check if it's a base64 image
                if (imageUrl.StartsWith("data:image"))
                {
                    return SaveBase64Image(imageUrl);
                }

                // Check if it's an existing image path in our system (starts with /images/)
                if (imageUrl.StartsWith("/images/"))
                {
                    // Verify file exists
                    string filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", imageUrl.TrimStart('/'));
                    if (System.IO.File.Exists(filePath))
                    {
                        // This is already a valid image in our system, return as is
                        return imageUrl;
                    }
                }

                // Check if URL is valid for external images
                if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out Uri? uri) ||
                    uri == null || (uri.Scheme != "http" && uri.Scheme != "https"))
                {
                    _logger.LogWarning("Invalid image URL format: {ImageUrl}", imageUrl);
                    return null;
                }

                // Rest of your existing HTTP download code
                using var httpClient = new HttpClient();
                httpClient.Timeout = TimeSpan.FromSeconds(10);
                httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 WebBaoDienTuApp");

                // Try to get head first to check content type
                try
                {
                    var headResponse = await httpClient.SendAsync(new HttpRequestMessage(HttpMethod.Head, uri));
                    if (!headResponse.IsSuccessStatusCode ||
                        headResponse.Content.Headers.ContentType == null ||
                        (headResponse.Content.Headers.ContentType != null &&
                        !headResponse.Content.Headers.ContentType.MediaType?.StartsWith("image/") == true))
                    {
                        _logger.LogWarning("URL does not point to a valid image: {ImageUrl}", imageUrl);
                        return null;
                    }
                }
                catch
                {
                    // Some servers don't support HEAD requests, continue anyway
                }

                // Download the image
                byte[] imageData = await httpClient.GetByteArrayAsync(uri);
                if (imageData.Length == 0)
                {
                    _logger.LogWarning("Downloaded image has zero length: {ImageUrl}", imageUrl);
                    return null;
                }

                // Determine file extension based on content or URL
                string fileExtension = ".jpg"; // Default

                // Try to get extension from URL
                string urlExtension = Path.GetExtension(uri.AbsolutePath).ToLower();
                if (!string.IsNullOrEmpty(urlExtension) &&
                    new[] { ".jpg", ".jpeg", ".png", ".gif" }.Contains(urlExtension))
                {
                    fileExtension = urlExtension;
                }

                return SaveImageData(imageData, fileExtension);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP error downloading image from URL: {ImageUrl}, Status: {Status}",
                    imageUrl, ex.StatusCode);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading image from URL: {ImageUrl}", imageUrl);
                return null;
            }
        }

        private string? SaveBase64Image(string base64String)
        {
            try
            {
                // Extract the actual base64 data and content type
                string[] parts = base64String.Split(',');
                if (parts.Length != 2)
                {
                    _logger.LogWarning("Invalid base64 image format");
                    return null;
                }

                // Get the content type from the data URI
                string[] contentTypeParts = parts[0].Split(':');
                if (contentTypeParts.Length < 2)
                {
                    _logger.LogWarning("Invalid base64 content type format");
                    return null;
                }

                string contentTypeWithExtra = contentTypeParts[1];
                string[] contentTypeSplits = contentTypeWithExtra.Split(';');
                string contentType = contentTypeSplits[0].Trim();

                // Determine file extension from content type
                string fileExtension = ".jpg"; // Default
                switch (contentType.ToLower())
                {
                    case "image/png":
                        fileExtension = ".png";
                        break;
                    case "image/gif":
                        fileExtension = ".gif";
                        break;
                    case "image/jpeg":
                    case "image/jpg":
                        fileExtension = ".jpg";
                        break;
                    default:
                        if (!contentType.StartsWith("image/"))
                        {
                            _logger.LogWarning("Invalid image content type: {ContentType}", contentType);
                            return null;
                        }
                        break;
                }

                // Convert base64 to byte array
                byte[] imageData = Convert.FromBase64String(parts[1]);

                // Save the image data to a file
                return SaveImageData(imageData, fileExtension);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing base64 image");
                return null;
            }
        }

        private string? SaveImageData(byte[] imageData, string fileExtension)
        {
            try
            {
                // Generate a unique filename
                string fileName = Guid.NewGuid().ToString() + fileExtension;
                string uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/images");

                // Ensure the directory exists
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                string filePath = Path.Combine(uploadsFolder, fileName);

                // Save the image data
                System.IO.File.WriteAllBytes(filePath, imageData);

                // Return the relative path to be stored in the database
                return "/images/" + fileName;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving image data");
                return null;
            }
        }
        #endregion
    }
}
