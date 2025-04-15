using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebBaoDienTu.Models;
using System.Threading.Tasks;

namespace WebBaoDienTu.Controllers
{
    public class HomeController : Controller
    {
        private readonly BaoDienTuContext _context;

        public HomeController(BaoDienTuContext context)
        {
            _context = context;
        }

        // Trang chủ: Hiển thị tất cả tin
        public async Task<IActionResult> Index()
        {
            ViewBag.Categories = await _context.Categories.ToListAsync();
            ViewData["IsHomePage"] = "true"; 
            ViewData["Title"] = "Tin hot nhất hôm nay";
            var baoDienTuContext = _context.News
                .Include(n => n.Author)
                .Include(n => n.Category)
                .Where(n => n.IsApproved && !n.IsDeleted);
            return View(await baoDienTuContext.ToListAsync());
        }

        // Trang danh mục: Hiển thị tin theo danh mục
        public async Task<IActionResult> Category(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null)
            {
                return NotFound(); 
            }

            var news = await _context.News
                .Include(n => n.Category)
                .Where(n => n.CategoryId == id && n.IsApproved && !n.IsDeleted)
                .ToListAsync();

            ViewBag.Categories = await _context.Categories.ToListAsync();
            ViewData["IsHomePage"] = "false"; 
            ViewData["Title"] = category.CategoryName; 
            return View("Index", news);
        }


        // Trang tìm kiếm
        [HttpGet]
        public async Task<IActionResult> Search(string query)
        {
            ViewBag.Categories = await _context.Categories.ToListAsync();

            IQueryable<News> newsQuery = _context.News
                .Include(n => n.Author)
                .Include(n => n.Category)
                .Where(n => n.IsApproved && !n.IsDeleted);

            if (!string.IsNullOrWhiteSpace(query))
            {
                newsQuery = newsQuery.Where(n => EF.Functions.Like(n.Title, $"%{query}%"));
            }

            var news = await newsQuery.ToListAsync();

            ViewBag.Categories = await _context.Categories.ToListAsync();
            ViewData["IsHomePage"] = "false"; // Không phải trang chủ
            ViewData["Title"] = string.IsNullOrWhiteSpace(query) ? "Tất cả tin tức" : $"Kết quả tìm kiếm cho '{query}'"; 
            ViewBag.SearchQuery = query;

            return View("Index", news);
        }
    }
}