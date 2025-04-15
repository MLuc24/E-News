// wwwroot/js/notification-bell.js

$(function () {
    // Global variables
    let bellAnimationInterval;
    let unreadNotificationsExist = false;

    // Function to update the bell animation based on notification count
    function updateBellAnimation(unreadCount) {
        const $bellIcon = $('.fas.fa-bell');

        // Clear any existing classes and intervals
        $bellIcon.removeClass('bell-animate bell-continuous-animate');
        clearInterval(bellAnimationInterval);

        // Set global state
        unreadNotificationsExist = unreadCount > 0;

        if (unreadNotificationsExist) {
            // Start with a strong ring animation
            $bellIcon.addClass('bell-animate');

            // After the initial animation completes, switch to continuous animation
            setTimeout(() => {
                if (unreadNotificationsExist) { // Check if still unread
                    $bellIcon.removeClass('bell-animate');
                    $bellIcon.addClass('bell-continuous-animate');
                }
            }, 1000); // Wait for the bell-animate animation to complete
        }
    }

    // Function to load notifications and update bell animation
    function loadAndAnimateNotifications() {
        console.log("Checking for notifications...");
        $.ajax({
            type: "GET",
            url: "/Sharing/GetNotifications",
            success: function (response) {
                console.log("Notification response:", response);
                if (response.success) {
                    const notifications = response.notifications || [];
                    const unreadCount = notifications.filter(n => !n.isRead).length;

                    // Update bell animation based on unread count
                    updateBellAnimation(unreadCount);

                    // Update the badge
                    const $notificationBadge = $('#notification-badge');
                    if (unreadCount > 0) {
                        $notificationBadge.text(unreadCount).show();
                    } else {
                        $notificationBadge.hide();
                    }

                    // Update notifications in dropdown (simplified)
                    updateNotificationDropdown(notifications);
                }
            },
            error: function (xhr, status, error) {
                console.error("Error loading notifications:", error);
            }
        });
    }

    // Function to update notification dropdown content
    function updateNotificationDropdown(notifications) {
        const $notificationContainer = $('#notification-container');
        const $noNotifications = $('#no-notifications');

        // Clear existing notifications
        $notificationContainer.find('.notification-item').remove();

        if (notifications.length > 0) {
            // Sort notifications: unread first, then by date
            notifications.sort(function (a, b) {
                if (a.isRead !== b.isRead) {
                    return a.isRead ? 1 : -1;
                }
                return new Date(b.shareDate) - new Date(a.shareDate);
            });

            // Add notifications to the dropdown
            notifications.forEach(function (notification) {
                const date = new Date(notification.shareDate);
                const formattedDate = new Intl.DateTimeFormat('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
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
            });

            $noNotifications.hide();

            // Add click handlers
            $('.notification-item').on('click', function () {
                const notificationId = $(this).data('id');
                markNotificationAsRead(notificationId);
            });
        } else {
            $noNotifications.show();
        }
    }

    // Function to mark a notification as read
    function markNotificationAsRead(notificationId) {
        $.ajax({
            type: "POST",
            url: "/Sharing/MarkAsRead",
            data: { notificationId: notificationId },
            headers: {
                "RequestVerificationToken": $('input[name="__RequestVerificationToken"]').val()
            },
            success: function (response) {
                if (response.success) {
                    console.log("Notification marked as read:", notificationId);
                    // Reload notifications to update unread count and animations
                    loadAndAnimateNotifications();
                }
            }
        });
    }

    // Handle "Mark All as Read" button
    $("#markAllAsRead").on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $.ajax({
            type: "POST",
            url: "/Sharing/MarkAllAsRead",
            headers: {
                "RequestVerificationToken": $('input[name="__RequestVerificationToken"]').val()
            },
            success: function (response) {
                if (response.success) {
                    // Reload notifications
                    loadAndAnimateNotifications();
                }
            }
        });
    });

    // Initialize notifications if dropdown exists
    if ($('#notificationDropdown').length) {
        // Initial load
        loadAndAnimateNotifications();

        // Set up periodic checks
        setInterval(loadAndAnimateNotifications, 30000);
    }
});
