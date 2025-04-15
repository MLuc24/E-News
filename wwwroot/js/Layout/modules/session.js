// wwwroot/js/Layout/modules/session.js

export default class SessionManager {
    constructor() {
        this.sessionCheckInProgress = false;
        this.isShowingSessionNotice = false;
    }

    setupSessionMonitoring() {
        // Check first time after 30 seconds
        setTimeout(() => this.checkSessionStatus(), 30000);

        // Then check every 60 seconds
        window.sessionCheckInterval = setInterval(() => this.checkSessionStatus(), 60000);

        // Check when tab becomes visible
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.checkSessionStatus();
            }
        });
    }

    checkSessionStatus() {
        // Avoid duplicate checks and don't check if already showing notice
        if (this.sessionCheckInProgress || this.isShowingSessionNotice) {
            return;
        }

        // Only check if authentication cookie exists
        if (document.cookie.indexOf('.AspNetCore.Cookies') > -1) {
            this.sessionCheckInProgress = true;

            $.ajax({
                type: "GET",
                url: "/api/Auth/check-session",
                cache: false,
                success: (response) => {
                    this.sessionCheckInProgress = false;
                    // Session is still valid
                    console.log("Phiên đăng nhập hợp lệ");
                },
                error: (xhr) => {
                    this.sessionCheckInProgress = false;
                    // Error will be handled by global ajaxError handler
                    console.log("Có lỗi khi kiểm tra phiên");
                }
            });
        }
    }

    handleUnauthorizedResponse(xhr) {
        // Only handle authentication errors (401 Unauthorized)
        if (xhr.status !== 401) return;

        // Avoid showing duplicate notices
        if (this.isShowingSessionNotice) return;

        try {
            const response = JSON.parse(xhr.responseText);

            if (response && response.requireLogin) {
                this.isShowingSessionNotice = true;

                // Only show session expired notification, ignore concurrent_login
                this.showSessionExpiredNotification(response.message);

                // Cancel periodic session checks
                if (window.sessionCheckInterval) {
                    clearInterval(window.sessionCheckInterval);
                }

                // Auto-redirect if user doesn't respond after a while
                setTimeout(() => {
                    if (document.visibilityState === 'visible' && this.isShowingSessionNotice) {
                        this.redirectToLogin();
                    }
                }, 120000); // 2 minutes
            }
        } catch (e) {
            console.error("Error processing response:", e);
            this.showSessionExpiredNotification();
        }
    }

    showSessionExpiredNotification(message) {
        const defaultMessage = 'Phiên đăng nhập của bạn đã hết hạn.';
        const notificationMessage = message || defaultMessage;
        this.isShowingSessionNotice = true;

        // Show toast
        this.showSessionToast('expired', notificationMessage);

        // Show SweetAlert2 modal
        Swal.fire({
            title: '<i class="fas fa-clock text-danger me-2"></i>Phiên đăng nhập đã hết hạn',
            html: `
                <div class="text-center">
                    <p class="mb-3">${notificationMessage}</p>
                    <p class="mb-0 text-muted small">
                        <i class="fas fa-info-circle me-1"></i>
                        Vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.
                    </p>
                </div>
            `,
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-sign-in-alt me-1"></i>Đăng nhập ngay',
            cancelButtonText: '<i class="fas fa-times me-1"></i>Để sau',
            allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                this.redirectToLogin();
            }
        });
    }

    showSessionToast(type, message) {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
            toastContainer.style.zIndex = '1080';
            document.body.appendChild(toastContainer);
        }

        // Always use expired session style
        const bgClass = 'bg-danger';
        const icon = 'fas fa-exclamation-triangle';
        const title = 'Phiên làm việc hết hạn';

        // Create toast
        const toast = document.createElement('div');
        toast.className = 'toast session-toast';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        toast.innerHTML = `
            <div class="toast-header ${bgClass} text-white">
                <i class="${icon} me-2"></i>
                <strong class="me-auto">${title}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                <p class="mb-2">${message}</p>
                <div class="mt-2 pt-2 border-top">
                    <button type="button" class="btn btn-sm btn-primary login-btn">
                        <i class="fas fa-sign-in-alt me-1"></i> Đăng nhập lại
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary ms-1" data-bs-dismiss="toast">
                        Đóng
                    </button>
                </div>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Add login button event
        toast.querySelector('.login-btn').addEventListener('click', () => {
            this.redirectToLogin();
        });

        // Initialize and show Bootstrap toast
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 10000,
            animation: true
        });

        bsToast.show();

        // Remove toast after hiding
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    // Complete replacement for the redirectToLogin method
    redirectToLogin() {
        // Instead of showing the modal or redirecting
        window.location = '/'; // Use = instead of .href to avoid URL issues

        // If you want to force a page refresh
        // window.location.reload();
    }
}
