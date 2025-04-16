// comment-role.js - Handle user roles and permissions for comments
document.addEventListener('DOMContentLoaded', function () {
    // Get authentication and role information from meta tags
    const isAuthenticated = document.querySelector('meta[name="user-authenticated"]')?.getAttribute('content') === 'true';
    const isAdmin = document.querySelector('meta[name="user-is-admin"]')?.getAttribute('content') === 'true';
    const currentUserId = document.querySelector('meta[name="user-id"]')?.getAttribute('content');
    const articleAuthorId = document.querySelector('meta[name="article-author-id"]')?.getAttribute('content');

    // Check if user is article author
    const isArticleAuthor = isAuthenticated && currentUserId === articleAuthorId;

    // Define permission levels
    const permissions = {
        // Permission to delete a comment
        canDeleteComment: (commentUserId) => {
            return isAuthenticated && (
                isAdmin ||                           // Admin can delete any comment
                currentUserId === commentUserId ||   // Users can delete their own comments
                isArticleAuthor                      // Article author can delete comments on their article
            );
        },
        // Permission to hide/unhide a comment
        canModerateComment: () => {
            return isAuthenticated && (isAdmin || isArticleAuthor);
        },
        // Permission to manage bulk actions
        canBulkManageComments: () => {
            return isAuthenticated && (isAdmin || isArticleAuthor);
        },
        // Permission to view hidden comments
        canSeeHiddenComments: () => {
            return isAuthenticated && (isAdmin || isArticleAuthor);
        },
        // Permission to use advanced filters
        canUseAdvancedFilters: () => {
            return isAuthenticated && (isAdmin || isArticleAuthor);
        },
        // Permission to see comment management panel
        canSeeManagementPanel: () => {
            return isAuthenticated && (isAdmin || isArticleAuthor);
        }
    };

    // Make permissions available globally
    window.commentPermissions = permissions;

    // Initialize UI based on permissions
    function initializeUIBasedOnPermissions() {
        // Show/hide moderation button based on permissions
        const moderationBtn = document.querySelector('.toggle-comment-moderation');
        if (moderationBtn) {
            if (permissions.canSeeManagementPanel()) {
                moderationBtn.style.display = '';
            } else {
                moderationBtn.style.display = 'none';
            }
        }

        // Show/hide filter buttons based on permissions
        const commentFilters = document.getElementById('comment-filters');
        if (commentFilters) {
            if (permissions.canUseAdvancedFilters()) {
                commentFilters.style.display = '';
            } else {
                commentFilters.style.display = 'none';
            }
        }

        // Show tooltips for actions based on permissions
        if (isAuthenticated) {
            document.querySelectorAll('.comment').forEach(comment => {
                const commentUserId = comment.dataset.userId;
                const deleteBtn = comment.querySelector('.delete-comment-item');
                const hideBtn = comment.querySelector('.hide-comment-item');
                const unhideBtn = comment.querySelector('.unhide-comment-item');

                if (deleteBtn && !permissions.canDeleteComment(commentUserId)) {
                    deleteBtn.style.display = 'none';
                }

                if ((hideBtn || unhideBtn) && !permissions.canModerateComment()) {
                    if (hideBtn) hideBtn.style.display = 'none';
                    if (unhideBtn) unhideBtn.style.display = 'none';
                }
            });
        }
    }

    // Run initialization after comment load
    setTimeout(initializeUIBasedOnPermissions, 1000);

    // Add event listeners for keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        // Only apply shortcuts if user can moderate comments
        if (!permissions.canModerateComment()) return;

        // Only apply if not typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // Ctrl+Shift+H: Hide focused comment
        if (e.ctrlKey && e.shiftKey && e.key === 'H') {
            const focusedComment = document.activeElement.closest('.comment');
            if (focusedComment) {
                const commentId = focusedComment.id.replace('comment-', '');
                if (window.commentFunctions && window.commentFunctions.hideComment) {
                    window.commentFunctions.hideComment(commentId);
                    e.preventDefault();
                }
            }
        }

        // Ctrl+Shift+U: Unhide focused comment
        if (e.ctrlKey && e.shiftKey && e.key === 'U') {
            const focusedComment = document.activeElement.closest('.comment');
            if (focusedComment) {
                const commentId = focusedComment.id.replace('comment-', '');
                if (window.commentFunctions && window.commentFunctions.unhideComment) {
                    window.commentFunctions.unhideComment(commentId);
                    e.preventDefault();
                }
            }
        }

        // Ctrl+Shift+D: Delete focused comment
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            const focusedComment = document.activeElement.closest('.comment');
            if (focusedComment) {
                const commentId = focusedComment.id.replace('comment-', '');
                const commentUserId = focusedComment.dataset.userId;
                if (permissions.canDeleteComment(commentUserId) &&
                    window.commentFunctions && window.commentFunctions.deleteComment) {
                    window.commentFunctions.deleteComment(commentId);
                    e.preventDefault();
                }
            }
        }
    });
});
