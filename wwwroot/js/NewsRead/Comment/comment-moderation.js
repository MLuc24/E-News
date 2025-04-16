// comment-moderation.js - UI-related moderation features
document.addEventListener('DOMContentLoaded', function () {
    // Get user authentication status and roles from meta tags
    const isAuthenticated = document.querySelector('meta[name="user-authenticated"]')?.getAttribute('content') === 'true';
    const isAdmin = document.querySelector('meta[name="user-is-admin"]')?.getAttribute('content') === 'true';
    const currentUserId = document.querySelector('meta[name="user-id"]')?.getAttribute('content');
    const articleAuthorId = document.querySelector('meta[name="article-author-id"]')?.getAttribute('content');

    console.log("Comment Moderation - Auth status:", isAuthenticated, "Admin:", isAdmin, "Current user ID:", currentUserId);

    // Global variables
    let isInModerationMode = false;

    // Wait for comment-combined.js to initialize
    setTimeout(function () {
        if (!window.commentFunctions) {
            console.error("Comment functions not found. Make sure comment-combined.js loads first.");
            return;
        }

        const { showAlert } = window.commentFunctions;

        // Set up comment filter event listeners
        setupCommentFilters();

        // Set up moderation button
        setupModerationButton();

        // Set up select all checkbox
        setupSelectAllCheckbox();

        // Set up bulk action buttons
        setupBulkActionButtons();

        // Add keyboard shortcuts for comment moderation
        document.addEventListener('keydown', function (event) {
            // Only enable shortcuts if user is admin or author and not typing in a form
            const isActionUser = isAdmin || (isAuthenticated && articleAuthorId === currentUserId);
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

            if (!isActionUser || isTyping) return;

            // Ctrl+Shift+H: Hide focused comment
            if (event.ctrlKey && event.shiftKey && event.key === 'H') {
                const focusedComment = document.activeElement.closest('.comment');
                if (focusedComment) {
                    const commentId = focusedComment.id.replace('comment-', '');
                    if (window.commentFunctions && window.commentFunctions.hideComment) {
                        window.commentFunctions.hideComment(commentId);
                        event.preventDefault();
                    }
                }
            }

            // Ctrl+Shift+U: Unhide focused comment
            if (event.ctrlKey && event.shiftKey && event.key === 'U') {
                const focusedComment = document.activeElement.closest('.comment');
                if (focusedComment) {
                    const commentId = focusedComment.id.replace('comment-', '');
                    if (window.commentFunctions && window.commentFunctions.unhideComment) {
                        window.commentFunctions.unhideComment(commentId);
                        event.preventDefault();
                    }
                }
            }

            // Ctrl+Shift+D: Delete focused comment
            if (event.ctrlKey && event.shiftKey && event.key === 'D') {
                const focusedComment = document.activeElement.closest('.comment');
                if (focusedComment) {
                    const commentId = focusedComment.id.replace('comment-', '');
                    if (window.commentFunctions && window.commentFunctions.deleteComment) {
                        window.commentFunctions.deleteComment(commentId);
                        event.preventDefault();
                    }
                }
            }
        });

        console.log('Comment moderation features initialized');
    }, 500);

    // Function to set up comment filters
    function setupCommentFilters() {
        const filterButtons = document.querySelectorAll('#comment-filters .comment-filter');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                // Remove active class from all buttons
                filterButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                this.classList.add('active');

                // Apply filter
                const filterType = this.dataset.filter;
                filterComments(filterType);
            });
        });
    }

    // Function to filter comments
    function filterComments(filterType) {
        const comments = document.querySelectorAll('.comment');

        comments.forEach(comment => {
            switch (filterType) {
                case 'all':
                    comment.style.display = '';
                    break;
                case 'author':
                    if (comment.querySelector('.badge-author')) {
                        comment.style.display = '';
                    } else {
                        comment.style.display = 'none';
                    }
                    break;
                case 'member':
                    if (comment.querySelector('.badge-member')) {
                        comment.style.display = '';
                    } else {
                        comment.style.display = 'none';
                    }
                    break;
                case 'guest':
                    if (comment.querySelector('.badge-guest')) {
                        comment.style.display = '';
                    } else {
                        comment.style.display = 'none';
                    }
                    break;
                case 'hidden':
                    if (comment.classList.contains('comment-hidden')) {
                        comment.style.display = '';
                    } else {
                        comment.style.display = 'none';
                    }
                    break;
            }
        });
    }

    // Function to toggle moderation mode
    function toggleCommentModeration() {
        // Toggle moderation tools visibility
        const moderationTools = document.getElementById('comment-moderation-tools');
        if (moderationTools) {
            const isVisible = moderationTools.style.display === 'block';
            moderationTools.style.display = isVisible ? 'none' : 'block';
            isInModerationMode = !isVisible;
        }

        // Toggle comment selection checkboxes
        toggleCommentCheckboxes(isInModerationMode);
    }

    // Function to toggle comment checkboxes
    function toggleCommentCheckboxes(show) {
        const comments = document.querySelectorAll('.comment');
        comments.forEach(comment => {
            // Find or create checkbox
            let checkbox = comment.querySelector('.comment-checkbox-container');

            if (!checkbox && show) {
                // Create checkbox if it doesn't exist
                const commentId = comment.id.replace('comment-', '');
                checkbox = document.createElement('div');
                checkbox.className = 'comment-checkbox-container me-2';
                checkbox.innerHTML = `
                    <input type="checkbox" class="comment-checkbox form-check-input"
                           value="${commentId}" id="comment-check-${commentId}">
                `;

                // Add checkbox to comment
                const firstChild = comment.querySelector('.d-flex.compact-comment');
                if (firstChild) {
                    firstChild.insertBefore(checkbox, firstChild.firstChild);
                }
            }

            if (checkbox) {
                checkbox.style.display = show ? 'block' : 'none';
            }

            // Add/remove moderation-mode class
            comment.classList.toggle('moderation-mode', show);
        });
    }

    // Function to set up moderation button
    function setupModerationButton() {
        const moderationBtn = document.querySelector('.toggle-comment-moderation');
        if (moderationBtn) {
            moderationBtn.addEventListener('click', toggleCommentModeration);
        }
    }

    // Function to set up select all checkbox
    function setupSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('select-all-comments');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function () {
                const checkboxes = document.querySelectorAll('.comment-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = this.checked;
                    // Toggle selected class on parent comment
                    const commentElement = cb.closest('.comment');
                    if (commentElement) {
                        commentElement.classList.toggle('selected', cb.checked);
                    }
                });
            });
        }
    }

    // Function to set up bulk action buttons
    function setupBulkActionButtons() {
        // Add click event listeners to bulk action buttons
        const bulkHideBtn = document.querySelector('.bulk-hide-comments-btn');
        const bulkUnhideBtn = document.querySelector('.bulk-unhide-comments-btn');
        const bulkDeleteBtn = document.querySelector('.bulk-delete-comments-btn');

        if (bulkHideBtn) bulkHideBtn.addEventListener('click', bulkHideComments);
        if (bulkUnhideBtn) bulkUnhideBtn.addEventListener('click', bulkUnhideComments);
        if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', bulkDeleteComments);
    }

    // Function to get selected comments
    function getSelectedComments() {
        const checkboxes = document.querySelectorAll('.comment-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    // Bulk operations
    function bulkHideComments() {
        const selectedComments = getSelectedComments();
        if (selectedComments.length === 0) {
            if (window.commentFunctions && window.commentFunctions.showAlert) {
                window.commentFunctions.showAlert('Vui lòng chọn ít nhất một bình luận để ẩn', 'warning');
            }
            return;
        }

        if (confirm(`Bạn có chắc chắn muốn ẩn ${selectedComments.length} bình luận đã chọn?`)) {
            // This will be handled by the comment-operations.js
            const event = new CustomEvent('bulkHideCommentsRequested', {
                detail: { commentIds: selectedComments }
            });
            document.dispatchEvent(event);
        }
    }

    function bulkUnhideComments() {
        const selectedComments = getSelectedComments();
        if (selectedComments.length === 0) {
            if (window.commentFunctions && window.commentFunctions.showAlert) {
                window.commentFunctions.showAlert('Vui lòng chọn ít nhất một bình luận để hiện', 'warning');
            }
            return;
        }

        // This will be handled by the comment-operations.js
        const event = new CustomEvent('bulkUnhideCommentsRequested', {
            detail: { commentIds: selectedComments }
        });
        document.dispatchEvent(event);
    }

    function bulkDeleteComments() {
        const selectedComments = getSelectedComments();
        if (selectedComments.length === 0) {
            if (window.commentFunctions && window.commentFunctions.showAlert) {
                window.commentFunctions.showAlert('Vui lòng chọn ít nhất một bình luận để xóa', 'warning');
            }
            return;
        }

        if (confirm(`Bạn có chắc chắn muốn xóa ${selectedComments.length} bình luận đã chọn? Hành động này không thể hoàn tác.`)) {
            // This will be handled by the comment-operations.js
            const event = new CustomEvent('bulkDeleteCommentsRequested', {
                detail: { commentIds: selectedComments }
            });
            document.dispatchEvent(event);
        }
    }

    // Add event listener for checkbox changes
    document.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('comment-checkbox')) {
            // Toggle selected class on parent comment
            const commentElement = e.target.closest('.comment');
            if (commentElement) {
                commentElement.classList.toggle('selected', e.target.checked);
            }
        }
    });
});
