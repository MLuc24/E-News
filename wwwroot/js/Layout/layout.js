// wwwroot/js/Layout/layout.js

/**
 * Layout Module - Main entry point for layout functionality
 * Provides authentication, notifications and session management
 */

// Core modules
import AuthManager from './modules/auth.js';
import NotificationManager from './modules/notification.js';
import SessionManager from './modules/session.js';
import UIManager from './modules/ui.js';

// Initialize components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.initialize();
});

class App {
    constructor() {
        // Initialize managers with dependencies
        this.auth = new AuthManager();
        this.notifications = new NotificationManager();
        this.session = new SessionManager();
        this.ui = new UIManager();
    }

    initialize() {
        // Setup core components
        this.setupEventHandlers();
        this.setupUIComponents();
        this.loadInitialData();
        this.initializeSessionMonitoring();
        this.checkUrlParameters();
        this.validateBrowserCompatibility();

        // Apply performance optimizations
        this.setupLazyLoading();
        this.setupScrollRestoration();
    }

    setupEventHandlers() {
        // Auth related forms
        this.setupAuthForms();

        // Notification related events
        this.notifications.setupNotificationEvents();

        // Footer subscription
        this.setupSubscriptionForms();
    }

    setupAuthForms() {
        // Login form
        $("#loginForm").on('submit', (e) => {
            e.preventDefault();
            this.auth.handleLogin(
                $("#loginEmail").val(),
                $("#loginPassword").val(),
                $("#rememberMe").is(":checked"),
                $(e.target).find('button[type="submit"]')
            );
        });

        // Register form
        $("#registerForm").on('submit', (e) => {
            e.preventDefault();
            this.auth.handleRegistration(
                $("#registerFullName").val(),
                $("#registerEmail").val(),
                $("#registerPassword").val(),
                $("#confirmPassword").val(),
                $(e.target).find('button[type="submit"]')
            );
        });

        // Verification form
        $("#verificationForm").on('submit', (e) => {
            e.preventDefault();
            this.auth.handleEmailVerification(
                $("#verificationCode").val(),
                $(e.target).find('button[type="submit"]')
            );
        });

        // Resend verification
        $("#resendVerificationBtn").on('click', () => {
            this.auth.resendVerificationCode($(this));
        });

        // Change password form
        $("#changePasswordForm").on('submit', (e) => {
            e.preventDefault();
            this.auth.handlePasswordChange(
                $("#currentPassword").val(),
                $("#newPassword").val(),
                $("#confirmNewPassword").val(),
                $(e.target).find('button[type="submit"]')
            );
        });

        // Logout
        window.logoutUser = () => this.auth.logout();
    }

    setupSubscriptionForms() {
        const footerSubscriptionForm = document.getElementById('footerSubscriptionForm');
        const toggleSubscriptionMode = document.getElementById('toggleSubscriptionMode');

        if (footerSubscriptionForm) {
            footerSubscriptionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubscription(e.target);
            });
        }

        if (toggleSubscriptionMode) {
            toggleSubscriptionMode.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleSubscriptionMode();
            });
        }
    }

    handleSubscription(form) {
        const email = document.getElementById('footerEmail').value.trim();
        const token = document.querySelector('input[name="__RequestVerificationToken"]').value;
        const subscribeBtn = form.querySelector('.btn-subscribe');
        const originalBtnHtml = subscribeBtn.innerHTML;

        // Show loading state
        this.ui.setButtonLoading(subscribeBtn, true, originalBtnHtml);

        // Submit the form via fetch API
        fetch('/News/Subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'RequestVerificationToken': token
            },
            body: `email=${encodeURIComponent(email)}&__RequestVerificationToken=${encodeURIComponent(token)}`
        })
            .then(response => response.json())
            .then(data => {
                this.ui.setButtonLoading(subscribeBtn, false, originalBtnHtml);
                this.showSubscriptionResult(data);
                if (data.success) form.reset();
            })
            .catch(error => {
                this.ui.setButtonLoading(subscribeBtn, false, originalBtnHtml);
                this.showSubscriptionError();
                console.error('Subscription error:', error);
            });
    }

    showSubscriptionResult(data) {
        const resultDiv = document.getElementById('subscriptionResult');
        resultDiv.style.display = 'block';

        if (data.success) {
            resultDiv.className = 'mt-2 text-success';
            resultDiv.innerHTML = `<small><i class="fas fa-check-circle me-1"></i>${data.message}</small>`;
        } else {
            resultDiv.className = 'mt-2 text-warning';
            resultDiv.innerHTML = `<small><i class="fas fa-exclamation-triangle me-1"></i>${data.message}</small>`;
        }

        setTimeout(() => {
            resultDiv.style.display = 'none';
        }, 5000);
    }

    showSubscriptionError() {
        const resultDiv = document.getElementById('subscriptionResult');
        resultDiv.style.display = 'block';
        resultDiv.className = 'mt-2 text-warning';
        resultDiv.innerHTML = '<small><i class="fas fa-exclamation-triangle me-1"></i>Có lỗi xảy ra. Vui lòng thử lại sau.</small>';
    }

    toggleSubscriptionMode() {
        const subscribeForm = document.getElementById('footerSubscriptionForm');
        const unsubscribeForm = document.getElementById('footerUnsubscribeForm');
        const toggleText = document.getElementById('subscriptionToggleText');

        if (subscribeForm.style.display !== 'none') {
            subscribeForm.style.display = 'none';
            unsubscribeForm.style.display = 'block';
            toggleText.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Đăng ký nhận tin';
        } else {
            subscribeForm.style.display = 'block';
            unsubscribeForm.style.display = 'none';
            toggleText.innerHTML = '<i class="fas fa-times-circle me-1"></i>Hủy đăng ký';
        }
    }

    setupUIComponents() {
        this.ui.initializeDropdowns();
        this.ui.setupAnimatedModalTitles();
        this.ui.highlightActiveNavItem();

        // Bootstrap components
        $('[data-bs-toggle="tooltip"]').tooltip();
        $('[data-bs-toggle="popover"]').popover();

        // Modal cleanup
        $("#loginModal").on("hidden.bs.modal", function () {
            const countdownId = $(this).data("countdownId");
            if (countdownId) {
                clearInterval(countdownId);
                $(this).removeData("countdownId");
            }
        });
    }

    loadInitialData() {
        this.auth.loadLoginAttempts();

        if ($('#notificationDropdown').length) {
            this.notifications.loadNotifications();
            setInterval(() => this.notifications.loadNotifications(), 30000);
        }
    }

    initializeSessionMonitoring() {
        // Setup AJAX error handler for session expiration
        $(document).ajaxError((event, xhr, settings) => {
            if (xhr.status === 401) {
                this.session.handleUnauthorizedResponse(xhr);
            }
        });
    }

    checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('sessionExpired')) {
            const reason = urlParams.get('reason') || 'expired';

            if (reason === 'concurrent_login') {
                this.session.showConcurrentLoginNotification();
            } else {
                this.session.showSessionExpiredNotification();
            }

            // Clean URL without reload
            const url = new URL(window.location);
            url.searchParams.delete('sessionExpired');
            url.searchParams.delete('reason');
            window.history.replaceState({}, '', url);
        } else {
            this.session.setupSessionMonitoring();
        }
    }

    validateBrowserCompatibility() {
        const isIE = navigator.userAgent.indexOf('MSIE') !== -1 ||
            navigator.userAgent.indexOf('Trident/') !== -1;
        if (isIE) {
            console.warn("Trình duyệt Internet Explorer không được hỗ trợ đầy đủ");
        }
    }

    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imgObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.target.dataset.src) {
                        entry.target.src = entry.target.dataset.src;
                        imgObserver.unobserve(entry.target);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imgObserver.observe(img);
            });
        } else {
            // Fallback for older browsers
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
            });
        }
    }

    setupScrollRestoration() {
        if (sessionStorage.getItem('scrollPos')) {
            const savedScrollPos = sessionStorage.getItem('scrollPos');
            window.scrollTo(0, parseInt(savedScrollPos));
            sessionStorage.removeItem('scrollPos');
        }

        window.addEventListener('beforeunload', function () {
            sessionStorage.setItem('scrollPos', window.scrollY);
        });
    }
}

// Add required styles for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes toastFadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .session-toast {
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
    
    @keyframes pulseAlert {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    .text-danger.animate-pulse, .text-warning.animate-pulse {
        animation: pulseAlert 2s infinite;
        display: inline-block;
    }
    
    .icon-animated {
        transition: transform 0.3s ease;
    }
    
    .icon-spin {
        animation: spin 1s infinite linear;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .modal-title-animated i {
        transform: scale(1.2);
    }
`;
document.head.appendChild(style);
