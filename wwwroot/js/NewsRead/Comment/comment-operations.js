// comment-operations.js - Core comment operations (delete, hide, unhide, report, copy)
document.addEventListener('DOMContentLoaded', function () {
    // Get user authentication status and roles from meta tags
    const isAuthenticated = document.querySelector('meta[name="user-authenticated"]')?.getAttribute('content') === 'true';
    const isAdmin = document.querySelector('meta[name="user-is-admin"]')?.getAttribute('content') === 'true';
    const currentUserId = document.querySelector('meta[name="user-id"]')?.getAttribute('content');
    const articleAuthorId = document.querySelector('meta[name="article-author-id"]')?.getAttribute('content');

    console.log("Comment Operations - Auth status:", isAuthenticated, "Admin:", isAdmin, "Current user ID:", currentUserId);

    // Wait for comment-combined.js to initialize
    setTimeout(function () {
        if (!window.commentFunctions) {
            console.error("Comment functions not found. Make sure comment-combined.js loads first.");
            return;
        }

        const {
            loadComments, showAlert
        } = window.commentFunctions;

        // Add copy function
        window.commentFunctions.copyComment = function (content) {
            console.log("Copying content:", content);
            navigator.clipboard.writeText(content)
                .then(() => showAlert('Đã sao chép nội dung bình luận vào clipboard', 'success'))
                .catch(err => {
                    console.error('Error copying text: ', err);
                    showAlert('Không thể sao chép. Vui lòng thử lại sau.', 'danger');
                });
        };

        // Define comment action functions
        window.commentFunctions.deleteComment = function (commentId) {
            // Remove the confirm dialog - if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;

            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
            if (!token) {
                showAlert('Lỗi xác thực, vui lòng làm mới trang và thử lại.', 'danger');
                return;
            }

            fetch(`/api/Comment/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': token
                }
            })
                .then(response => {
                    if (!response.ok) throw new Error('Lỗi khi xóa bình luận');
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        // Mark the comment as deleted in the UI
                        const commentElement = document.getElementById(`comment-${commentId}`);
                        if (commentElement) {
                            commentElement.classList.add('comment-deleted');
                            commentElement.querySelector('.comment-content').innerHTML = '<em class="text-muted">Bình luận này đã bị xóa.</em>';

                            // Hide comment actions
                            const actionsDiv = commentElement.querySelector('.comment-actions');
                            if (actionsDiv) actionsDiv.innerHTML = '';

                            // Hide comment menu
                            const menuToggle = commentElement.querySelector('.comment-menu-toggle');
                            if (menuToggle) menuToggle.style.display = 'none';
                        }
                        showAlert('Bình luận đã được xóa thành công.', 'success');
                    } else {
                        showAlert(data.message || 'Có lỗi xảy ra khi xóa bình luận.', 'danger');
                    }
                })
                .catch(error => {
                    console.error('Error deleting comment:', error);
                    showAlert('Có lỗi xảy ra khi xóa bình luận. Vui lòng thử lại sau.', 'danger');
                });
        };


        window.commentFunctions.hideComment = function (commentId) {
            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
            if (!token) {
                showAlert('Lỗi xác thực, vui lòng làm mới trang và thử lại.', 'danger');
                return;
            }

            fetch(`/api/Comment/hide/${commentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': token
                }
            })
                .then(response => {
                    if (!response.ok) throw new Error('Lỗi khi ẩn bình luận');
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        // Mark the comment as hidden in the UI
                        const commentElement = document.getElementById(`comment-${commentId}`);
                        if (commentElement) {
                            commentElement.classList.add('comment-hidden');
                            commentElement.querySelector('.comment-content').innerHTML = '<em class="text-muted">Bình luận này đã bị ẩn.</em>';

                            // Update action buttons
                            const actionDiv = commentElement.querySelector('.comment-actions');
                            if (actionDiv) {
                                const hideBtn = actionDiv.querySelector('.hide-comment-btn');
                                if (hideBtn) {
                                    const unhideBtn = document.createElement('button');
                                    unhideBtn.className = 'btn btn-sm btn-link text-success unhide-comment-btn p-0 ms-2';
                                    unhideBtn.dataset.id = commentId;
                                    unhideBtn.title = 'Hiện bình luận';
                                    unhideBtn.innerHTML = '<i class="fas fa-eye me-1"></i> Hiện';
                                    unhideBtn.addEventListener('click', function () {
                                        window.commentFunctions.unhideComment(this.dataset.id);
                                    });
                                    hideBtn.replaceWith(unhideBtn);
                                }
                            }

                            // Update menu buttons
                            const menuContainer = commentElement.querySelector('.comment-menu');
                            if (menuContainer) {
                                const hideMenuItem = menuContainer.querySelector('.hide-comment-item');
                                if (hideMenuItem) {
                                    const unhideMenuItem = document.createElement('div');
                                    unhideMenuItem.className = 'comment-menu-item text-success unhide-comment-item';
                                    unhideMenuItem.dataset.id = commentId;
                                    unhideMenuItem.innerHTML = '<i class="fas fa-eye"></i> Hiện bình luận';
                                    unhideMenuItem.addEventListener('click', function () {
                                        window.commentFunctions.unhideComment(this.dataset.id);
                                        menuContainer.classList.remove('show');
                                    });
                                    hideMenuItem.replaceWith(unhideMenuItem);
                                }
                            }
                        }
                        showAlert('Bình luận đã được ẩn thành công.', 'success');
                    } else {
                        showAlert(data.message || 'Có lỗi xảy ra khi ẩn bình luận.', 'danger');
                    }
                })
                .catch(error => {
                    console.error('Error hiding comment:', error);
                    showAlert('Có lỗi xảy ra khi ẩn bình luận. Vui lòng thử lại sau.', 'danger');
                });
        };

        window.commentFunctions.unhideComment = function (commentId) {
            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
            if (!token) {
                showAlert('Lỗi xác thực, vui lòng làm mới trang và thử lại.', 'danger');
                return;
            }

            fetch(`/api/Comment/unhide/${commentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': token
                }
            })
                .then(response => {
                    if (!response.ok) throw new Error('Lỗi khi hiện bình luận');
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        // Reload the comments to get the updated content
                        loadComments();
                        showAlert('Bình luận đã được hiện thành công.', 'success');
                    } else {
                        showAlert(data.message || 'Có lỗi xảy ra khi hiện bình luận.', 'danger');
                    }
                })
                .catch(error => {
                    console.error('Error unhiding comment:', error);
                    showAlert('Có lỗi xảy ra khi hiện bình luận. Vui lòng thử lại sau.', 'danger');
                });
        };

        // Function to create a comment element with proper author role handling
        function createCommentElement(comment, isReply) {
            const commentDiv = document.createElement('div');
            commentDiv.className = isReply ? 'comment reply mb-1' : 'comment mb-2';
            if (comment.isHidden) commentDiv.className += ' comment-hidden';
            commentDiv.id = `comment-${comment.commentId}`;
            commentDiv.dataset.userId = comment.userId; // Add user ID for permission checks

            const avatarColor = stringToColor(comment.author || 'Anonymous');
            const userInitials = getInitials(comment.author || 'Anonymous');
            const timeAgo = formatTimeAgo(new Date(comment.createdAt));

            // Determine the appropriate badge based on the author's role
            let authorBadge;

            // Check if comment author matches article author (case-insensitive)
            if (articleAuthorName && comment.author &&
                comment.author.trim().toLowerCase() === articleAuthorName.trim().toLowerCase()) {
                authorBadge = `<span class="badge badge-author ms-2 comment-author-role">Tác giả</span>`;
            }
            // Otherwise use normal classification
            else if (comment.isAuthenticated) {
                authorBadge = `<span class="badge badge-member ms-2 comment-author-role">Thành viên</span>`;
            } else {
                authorBadge = `<span class="badge badge-guest ms-2 comment-author-role">Khách</span>`;
            }

            // Determine if content should be hidden
            const contentHtml = comment.isHidden
                ? '<em class="text-muted">Bình luận này đã bị ẩn.</em>'
                : comment.content;

            // Always show menu for authenticated users
            const shouldShowMenu = isAuthenticated;

            // Check if this comment is from the user themselves
            const isOwnComment = currentUserId === String(comment.userId);

            // Check if the user is viewing their own article
            const isViewingOwnArticle = currentUserId === articleAuthorId;

            // Three-dot menu HTML - always add for authenticated users, but with different options
            const menuHtml = shouldShowMenu ? `
        <div class="comment-header position-relative">
            <div class="comment-menu-toggle" data-comment-id="${comment.commentId}">
                <i class="fas fa-ellipsis-h"></i>
            </div>
            <div class="comment-menu" id="menu-${comment.commentId}">
                <!-- Copy option always available for all users -->
                <div class="comment-menu-item text-primary copy-comment-item" data-id="${comment.commentId}" data-content="${comment.content}">
                    <i class="fas fa-copy"></i> Sao chép
                </div>
                
                ${/* Delete option for admin, article author or comment owner */
                (isOwnComment || isAdmin || isViewingOwnArticle) ?
                    `<div class="comment-menu-item text-danger delete-comment-item" data-id="${comment.commentId}">
                        <i class="fas fa-trash-alt"></i> Xóa
                    </div>` : ''
                }
                
                ${/* Hide/Unhide options only for admins and article authors */
                (isAdmin || isViewingOwnArticle) ?
                    comment.isHidden ?
                        `<div class="comment-menu-item text-success unhide-comment-item" data-id="${comment.commentId}">
                        <i class="fas fa-eye"></i> Hiện bình luận
                    </div>` :
                        `<div class="comment-menu-item text-warning hide-comment-item" data-id="${comment.commentId}">
                        <i class="fas fa-eye-slash"></i> Ẩn bình luận
                    </div>`
                    : ''
                }
                
                ${/* Report option only for non-admins and not for their own comments */
                (!isAdmin && !isOwnComment) ?
                    `<div class="comment-menu-item text-secondary report-comment-item" data-id="${comment.commentId}">
                        <i class="fas fa-flag"></i> Báo cáo
                    </div>` : ''
                }
            </div>
        </div>
    ` : '';

            commentDiv.innerHTML = `
        <div class="d-flex compact-comment">
            <div class="avatar-circle" style="background-color: ${avatarColor}">
                <span class="avatar-text">${userInitials}</span>
            </div>
            <div class="ms-2 flex-grow-1">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <span class="fw-medium comment-author-name">
                            ${comment.author || 'Ẩn danh'}
                        </span>
                        ${authorBadge}
                    </div>
                    <div class="d-flex align-items-center">
                        <small class="text-muted comment-metadata me-2">${timeAgo}</small>
                        ${menuHtml}
                    </div>
                </div>
                <div class="comment-content">
                    ${contentHtml}
                </div>
                <div class="comment-actions mt-1">
                    <button class="btn btn-sm btn-link reply-btn p-0" data-id="${comment.commentId}" data-author="${comment.author}">
                        <i class="fas fa-reply me-1"></i> Trả lời
                    </button>
                </div>
            </div>
        </div>
    `;

            // If this comment has replies, add them
            if (!isReply && comment.replies && comment.replies.length > 0) {
                const repliesContainer = document.createElement('div');
                repliesContainer.className = 'replies-container mt-1';

                comment.replies.forEach(reply => {
                    const replyElement = createCommentElement(reply, true);
                    repliesContainer.appendChild(replyElement);
                });

                commentDiv.appendChild(repliesContainer);
            }

            // Add event listeners for UI elements
            setTimeout(() => {
                // Reply button event listener
                const replyBtn = commentDiv.querySelector('.reply-btn');
                if (replyBtn) {
                    replyBtn.addEventListener('click', function () {
                        setReplyTo(this.dataset.id, this.dataset.author);
                    });
                }

                // Three-dot menu toggle event listener
                const menuToggle = commentDiv.querySelector('.comment-menu-toggle');
                if (menuToggle) {
                    menuToggle.addEventListener('click', function (e) {
                        e.stopPropagation();
                        const commentId = this.dataset.commentId;
                        const menu = document.getElementById(`menu-${commentId}`);
                        // Close all other open menus first
                        document.querySelectorAll('.comment-menu.show').forEach(m => {
                            if (m.id !== `menu-${commentId}`) {
                                m.classList.remove('show');
                            }
                        });
                        // Toggle this menu
                        menu.classList.toggle('show');
                    });
                }

                // Add event listener for Copy button
                const copyItem = commentDiv.querySelector('.copy-comment-item');
                if (copyItem) {
                    copyItem.addEventListener('click', function () {
                        const commentId = this.dataset.id;
                        const content = comment.content;
                        if (window.commentFunctions && window.commentFunctions.copyComment) {
                            window.commentFunctions.copyComment(content);
                        }
                        // Close the menu
                        document.getElementById(`menu-${commentId}`).classList.remove('show');
                    });
                }

                // Menu item event listeners
                const deleteItem = commentDiv.querySelector('.delete-comment-item');
                const hideItem = commentDiv.querySelector('.hide-comment-item');
                const unhideItem = commentDiv.querySelector('.unhide-comment-item');
                const reportItem = commentDiv.querySelector('.report-comment-item');

                if (deleteItem) {
                    deleteItem.addEventListener('click', function () {
                        const commentId = this.dataset.id;
                        if (window.commentFunctions && window.commentFunctions.deleteComment) {
                            window.commentFunctions.deleteComment(commentId);
                        }
                        // Close the menu
                        document.getElementById(`menu-${commentId}`).classList.remove('show');
                    });
                }

                if (hideItem) {
                    hideItem.addEventListener('click', function () {
                        const commentId = this.dataset.id;
                        if (window.commentFunctions && window.commentFunctions.hideComment) {
                            window.commentFunctions.hideComment(commentId);
                        }
                        // Close the menu
                        document.getElementById(`menu-${commentId}`).classList.remove('show');
                    });
                }

                if (unhideItem) {
                    unhideItem.addEventListener('click', function () {
                        const commentId = this.dataset.id;
                        if (window.commentFunctions && window.commentFunctions.unhideComment) {
                            window.commentFunctions.unhideComment(commentId);
                        }
                        // Close the menu
                        document.getElementById(`menu-${commentId}`).classList.remove('show');
                    });
                }

                if (reportItem) {
                    reportItem.addEventListener('click', function () {
                        const commentId = this.dataset.id;
                        if (window.commentFunctions && window.commentFunctions.reportComment) {
                            window.commentFunctions.reportComment(commentId);
                        }
                        // Close the menu
                        document.getElementById(`menu-${commentId}`).classList.remove('show');
                    });
                }
            }, 0);

            return commentDiv;
        }


        // Handle bulk action implementation (called by the events in comment-moderation.js)
        document.addEventListener('bulkHideCommentsRequested', function (event) {
            const commentIds = event.detail.commentIds;
            if (!commentIds || commentIds.length === 0) return;

            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
            if (!token) {
                showAlert('Lỗi xác thực, vui lòng làm mới trang và thử lại.', 'danger');
                return;
            }

            // Implementation for bulk hide
            Promise.all(commentIds.map(commentId =>
                fetch(`/api/Comment/hide/${commentId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'RequestVerificationToken': token
                    }
                }).then(res => res.json())
            ))
                .then(() => {
                    loadComments();
                    showAlert(`Đã ẩn ${commentIds.length} bình luận thành công`, 'success');
                })
                .catch(error => {
                    console.error('Bulk hide error:', error);
                    showAlert('Có lỗi xảy ra khi ẩn các bình luận. Vui lòng thử lại.', 'danger');
                });
        });

        document.addEventListener('bulkUnhideCommentsRequested', function (event) {
            const commentIds = event.detail.commentIds;
            if (!commentIds || commentIds.length === 0) return;

            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
            if (!token) {
                showAlert('Lỗi xác thực, vui lòng làm mới trang và thử lại.', 'danger');
                return;
            }

            // Implementation for bulk unhide
            Promise.all(commentIds.map(commentId =>
                fetch(`/api/Comment/unhide/${commentId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'RequestVerificationToken': token
                    }
                }).then(res => res.json())
            ))
                .then(() => {
                    loadComments();
                    showAlert(`Đã hiện ${commentIds.length} bình luận thành công`, 'success');
                })
                .catch(error => {
                    console.error('Bulk unhide error:', error);
                    showAlert('Có lỗi xảy ra khi hiện các bình luận. Vui lòng thử lại.', 'danger');
                });
        });

        document.addEventListener('bulkDeleteCommentsRequested', function (event) {
            const commentIds = event.detail.commentIds;
            if (!commentIds || commentIds.length === 0) return;

            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
            if (!token) {
                showAlert('Lỗi xác thực, vui lòng làm mới trang và thử lại.', 'danger');
                return;
            }

            // Implementation for bulk delete
            Promise.all(commentIds.map(commentId =>
                fetch(`/api/Comment/${commentId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'RequestVerificationToken': token
                    }
                }).then(res => res.json())
            ))
                .then(() => {
                    loadComments();
                    showAlert(`Đã xóa ${commentIds.length} bình luận thành công`, 'success');
                })
                .catch(error => {
                    console.error('Bulk delete error:', error);
                    showAlert('Có lỗi xảy ra khi xóa các bình luận. Vui lòng thử lại.', 'danger');
                });
        });

        // Close dropdown menus when clicking outside
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.comment-menu') && !e.target.closest('.comment-menu-toggle')) {
                document.querySelectorAll('.comment-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });

        console.log('Comment operations initialized');
    }, 500);
});
