// wwwroot/js/Layout/modules/ui.js

export default class UIManager {
    constructor() {
        // No state needed for this class
    }

    initializeDropdowns() {
        $('.dropdown-toggle').dropdown();
    }

    setupAnimatedModalTitles() {
        // Add animation to modal title icons
        document.querySelectorAll('.modal-title i').forEach(icon => {
            icon.classList.add('icon-animated');
        });

        // Add animation when modal shows/hides
        $('.modal').on('show.bs.modal', function () {
            $(this).find('.modal-title').addClass('modal-title-animated');
        });

        $('.modal').on('hide.bs.modal', function () {
            $(this).find('.modal-title').removeClass('modal-title-animated');
        });
    }

    highlightActiveNavItem() {
        const path = window.location.pathname;
        const categoryId = this.getCategoryIdFromPath(path);

        // Remove active class from all links
        const categoryLinks = document.querySelectorAll('.navbar-nav .nav-link');
        categoryLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Add active class to current category if found
        if (categoryId) {
            const activeLink = document.querySelector(`.nav-link[href*="Category/${categoryId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }

        // Handle Home page
        if (path === '/' || path.toLowerCase() === '/home' || path.toLowerCase() === '/home/index') {
            const homeLink = document.querySelector('.navbar-brand');
            if (homeLink) {
                homeLink.classList.add('active-home');
            }
        }
    }

    // Extract category ID from URL path
    getCategoryIdFromPath(path) {
        if (path.includes('/Home/Category/')) {
            const parts = path.split('/');
            return parts[parts.length - 1];
        }
        return null;
    }

    // Set button loading state
    setButtonLoading(button, isLoading, originalHtml = null) {
        if (isLoading) {
            if (originalHtml === null) {
                button.data('original-html', button.html());
            } else {
                button.data('original-html', originalHtml);
            }
            button.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...');
            button.prop('disabled', true);
        } else {
            button.html(button.data('original-html'));
            button.prop('disabled', false);
        }
    }
}
