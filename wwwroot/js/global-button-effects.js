/**
 * global-button-effects.js - Enhanced for better button functionality
 * Provides consistent button animations and effects across the application
 */

document.addEventListener('DOMContentLoaded', function () {
    // Apply ripple effect to all buttons
    applyRippleEffect();

    // Add hover effects to all buttons
    addHoverEffects();

    // Setup CSRF token for AJAX requests
    setupCSRFToken();

    // Setup AJAX interceptor
    setupAjaxInterceptor();

    // Setup mutation observer for dynamically added buttons
    setupButtonObserver();


    // Fix repost and archive functionality
    fixRepostAndArchiveFunctionality();
});

/**
 * Apply ripple effect to all buttons
 */
function applyRippleEffect() {
    document.querySelectorAll('.btn').forEach(button => {
        if (!button.getAttribute('data-has-ripple')) {
            button.setAttribute('data-has-ripple', 'true');

            button.addEventListener('mousedown', function (e) {
                // Only create ripple if clicked directly on button
                if (this.contains(e.target)) {
                    const rect = this.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const ripple = document.createElement('span');
                    ripple.classList.add('ripple');
                    ripple.style.left = x + 'px';
                    ripple.style.top = y + 'px';

                    this.appendChild(ripple);

                    // Remove the ripple after animation completes
                    setTimeout(() => ripple.remove(), 600);
                }
            });
        }
    });
}

/**
 * Add hover effects to all buttons
 */
function addHoverEffects() {
    document.querySelectorAll('.btn').forEach(button => {
        // Add hover effect class if missing
        if (!button.classList.contains('btn-hover-effect')) {
            button.classList.add('btn-hover-effect');
        }

        // Add special classes based on context
        if (button.closest('.modal-footer')) {
            button.classList.add('modal-action-btn');
        }

        if ((button.type === 'submit' || button.getAttribute('type') === 'submit') &&
            !button.classList.contains('btn-search')) {
            button.classList.add('submit-btn');
        }

        // Ensure proper classes for buttons in various contexts
        if (button.closest('.action-buttons') ||
            button.closest('.my-news-action-buttons') ||
            button.closest('.card-actions') ||
            button.closest('.news-card-actions')) {
            button.classList.add('action-btn');
        }

        // Special styling for share buttons
        if (button.closest('.sharing-container') ||
            button.closest('.share-buttons') ||
            button.closest('.social-share')) {
            button.classList.add('share-btn');
        }
    });
}

/**
 * Add icons to share buttons if missing
 */


/**
 * Setup CSRF token for AJAX requests
 */
function setupCSRFToken() {
    if (!document.querySelector('input[name="__RequestVerificationToken"]')) {
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        if (csrfMeta) {
            const tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = '__RequestVerificationToken';
            tokenInput.value = csrfMeta.getAttribute('content');
            document.body.appendChild(tokenInput);
        }
    }
}

/**
 * Setup jQuery AJAX interceptor to include CSRF token in all requests
 */
function setupAjaxInterceptor() {
    if (typeof $ !== 'undefined' && $.ajax) {
        $.ajaxSetup({
            beforeSend: function (xhr, settings) {
                if (!(/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type)) && !this.crossDomain) {
                    const token = document.querySelector('input[name="__RequestVerificationToken"]');
                    if (token) {
                        xhr.setRequestHeader("RequestVerificationToken", token.value);
                    }
                }
            }
        });
    }
}


function fixRepostAndArchiveFunctionality() {
    // Fix for repost button in MyNews
    const repostButton = document.getElementById('confirmRepostButton');
    if (repostButton) {
        repostButton.addEventListener('click', function () {
            const id = document.getElementById('repostNewsId').value;
            const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

            fetch('/News/Repost/' + id, {
                method: 'POST',
                headers: {
                    'RequestVerificationToken': token,
                    'Content-Type': 'application/json'
                }
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('repostModal'));
                        if (modal) modal.hide();

                        showToast('Đăng lại tin tức thành công! Tin tức đã chuyển sang trạng thái chờ duyệt.', 'success');
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        showToast(data.message || 'Đăng lại thất bại!', 'danger');
                    }
                })
                .catch(error => {
                    showToast('Có lỗi xảy ra khi đăng lại tin tức: ' + error.message, 'danger');
                });
        });
    }

    // Fix for archive confirmation button
    const archiveButton = document.getElementById('confirmCancelButton');
    if (archiveButton) {
        archiveButton.addEventListener('click', function () {
            const id = document.getElementById('cancelNewsId').value;
            const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

            fetch('/News/Archive/' + id, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'RequestVerificationToken': token
                },
                body: 'id=' + id
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('cancelModal'));
                        if (modal) modal.hide();

                        showToast('Tin tức đã được lưu trữ thành công!', 'success');
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        showToast(data.message || 'Lưu trữ thất bại', 'danger');
                    }
                })
                .catch(error => {
                    showToast('Có lỗi xảy ra khi lưu trữ: ' + error.message, 'danger');
                });
        });
    }
}

/**
 * Setup mutation observer to apply effects to dynamically added buttons
 */
function setupButtonObserver() {
    // Create a mutation observer to watch for dynamically added buttons
    const observer = new MutationObserver(function (mutations) {
        let buttonAdded = false;

        mutations.forEach(function (mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function (node) {
                    // Check if the added node is a button
                    if (node.nodeType === 1) {
                        if (node.classList && node.classList.contains('btn')) {
                            buttonAdded = true;
                        }

                        // Check for buttons inside the added node
                        const buttons = node.querySelectorAll ? node.querySelectorAll('.btn') : [];
                        if (buttons.length > 0) {
                            buttonAdded = true;
                        }
                    }
                });
            }
        });

        // If any buttons were added, reapply our effects
        if (buttonAdded) {
            applyRippleEffect();
            addHoverEffects();
            addShareButtonIcons();
        }
    });

    // Start observing the document body for added nodes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

/**
 * Generic function to show toast notifications
 * 
 * @param {string} message - Message to display
 * @param {string} type - Message type (success/danger)
 */
function showToast(message, type) {
    const toast = document.getElementById('actionToast') ||
        document.getElementById('successToast');

    if (toast) {
        toast.classList.remove('bg-success', 'bg-danger');
        toast.classList.add(type === 'danger' ? 'bg-danger' : 'bg-success');

        const messageElement = toast.querySelector('#toastMessage') ||
            toast.querySelector('.toast-body span');

        if (messageElement) {
            messageElement.textContent = message;
        }

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

/**
 * Animate an icon in a modal during AJAX operations.
 * @param {string} modalId - The ID of the modal.
 * @param {string} iconClass - The class of the icon to animate.
 * @param {boolean} isStart - Whether to start or stop the animation.
 */
function animateModalIcon(modalId, iconClass, isStart) {
    const modal = document.getElementById(modalId);
    const icon = modal.querySelector(`.${iconClass}`);
    if (!icon) return;

    if (isStart) {
        icon.classList.add('icon-spin');
    } else {
        icon.classList.remove('icon-spin');
    }
}

