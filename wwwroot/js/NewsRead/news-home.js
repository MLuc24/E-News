// news-home.js - JavaScript functionality for the news home page
document.addEventListener('DOMContentLoaded', function () {
    // Thêm hiệu ứng chuyển đổi mượt mà cho các tin tức
    const newsItems = document.querySelectorAll('.news-item');
    newsItems.forEach((item, index) => {
        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, 100 * (index + 1));
    });
});

