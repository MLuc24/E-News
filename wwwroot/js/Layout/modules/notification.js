// wwwroot/js/Layout/modules/notifications.js

export default class NotificationManager {
    constructor() {
        this.lastNotificationCount = 0;
    }

    setupNotificationEvents() {
        // Mark all notifications as read
        $("#markAllAsRead, #mobileMarkAllAsRead").on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.markAllAsRead();
        });
    }

    loadNotifications() {
        $.ajax({
            type: "GET",
            url: "/Sharing/GetNotifications",
            success: (response) => {
                if (response.success) {
                    this.updateNotifications(response.notifications || []);
                } else {
                    console.error("Lỗi khi tải thông báo:", response.message);
                }
            },
            error: (xhr, status, error) => {
                console.error("AJAX error:", status, error);
            }
        });
    }

    updateNotifications(notifications) {
        // Sort: unread first, then by date
        notifications.sort((a, b) => {
            if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
            return new Date(b.shareDate) - new Date(a.shareDate);
        });

        const unreadCount = notifications.filter(n => !n.isRead).length;
        const $notificationBadge = $('#notification-badge');
        const $mobileNotificationBadge = $('#mobile-notification-badge');
        const $notificationContainer = $('#notification-container');
        const $mobileNotificationContainer = $('#mobile-notification-container');
        const $noNotifications = $('#no-notifications');
        const $mobileNoNotifications = $('#mobile-no-notifications');
        const $bellIcon = $('.fas.fa-bell');

        // Animate bell for new notifications
        if (unreadCount > this.lastNotificationCount && this.lastNotificationCount !== 0) {
            $bellIcon.removeClass('bell-animate');
            void $bellIcon[0].offsetWidth; // Force reflow
            $bellIcon.addClass('bell-animate');
        }

        this.lastNotificationCount = unreadCount;

        // Update badges and containers
        if (unreadCount > 0) {
            $notificationBadge.text(unreadCount).show();
            $mobileNotificationBadge.text(unreadCount).show();
            $noNotifications.hide();
            $mobileNoNotifications.hide();
        } else {
            $notificationBadge.hide();
            $mobileNotificationBadge.hide();

            if (notifications.length === 0) {
                $noNotifications.show();
                $mobileNoNotifications.show();
            } else {
                $noNotifications.hide();
                $mobileNoNotifications.hide();
            }
        }

        // Clear existing notifications
        $notificationContainer.find('.notification-item').remove();
        $mobileNotificationContainer.find('.notification-item').remove();

        // Create notification items
        if (notifications.length > 0) {
            notifications.forEach(notification => {
                const date = new Date(notification.shareDate);
                const formattedDate = new Intl.DateTimeFormat('vi-VN', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }).format(date);

                const itemClass = notification.isRead ? '' : 'unread';
                const messageHtml = notification.message ?
                    `<small class="text-muted">"${notification.message}"</small><br>` : '';

                const notificationHtml = `
                    <a href="/News/Read/${notification.newsId}" class="dropdown-item notification-item ${itemClass}" data-id="${notification.id}">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1 text-truncate">${notification.title}</h6>
                            <small>${formattedDate}</small>
                        </div>
                        ${messageHtml}
                        <small class="text-primary">Nhấn để xem bài viết</small>
                    </a>
                `;

                $notificationContainer.append(notificationHtml);
                $mobileNotificationContainer.append(notificationHtml);
            });
        }

        // Add click handlers
        $('.notification-item').on('click', (e) => {
            const notificationId = $(e.currentTarget).data('id');
            this.markNotificationAsRead(notificationId);
        });
    }

    markNotificationAsRead(notificationId) {
        $.ajax({
            type: "POST",
            url: "/Sharing/MarkAsRead",
            data: { notificationId: notificationId },
            headers: {
                "RequestVerificationToken": $('input[name="__RequestVerificationToken"]').val()
            },
            success: (response) => {
                if (response.success) {
                    console.log("Đã đánh dấu thông báo đã đọc:", notificationId);
                }
            },
            error: (xhr) => {
                console.error("Lỗi khi đánh dấu thông báo là đã đọc:", xhr.responseText);
            }
        });
    }

    markAllAsRead() {
        $.ajax({
            type: "POST",
            url: "/Sharing/MarkAllAsRead",
            headers: {
                "RequestVerificationToken": $('input[name="__RequestVerificationToken"]').val()
            },
            success: (response) => {
                if (response.success) {
                    this.loadNotifications();
                }
            }
        });
    }
}
