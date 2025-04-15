// comment-combined.js - Consolidated comment functionality with role handling
document.addEventListener('DOMContentLoaded', function () {
    const newsId = document.getElementById('newsId')?.value;
    if (!newsId) {
        console.error("News ID not found");
        return;
    }

    // Get the article author name from the page metadata
    const articleAuthorElement = document.querySelector('meta[name="article-author"]');
    const articleAuthorName = articleAuthorElement ? articleAuthorElement.getAttribute('content') : null;

    console.log("Article author from metadata:", articleAuthorName);

    const commentsContainer = document.getElementById('comments-container');
    const commentForm = document.getElementById('comment-form');
    const commentContent = document.getElementById('commentContent');
    const parentCommentId = document.getElementById('parentCommentId');
    const cancelReplyBtn = document.getElementById('cancel-reply');
    const noCommentsMessage = document.getElementById('no-comments');
    const commentCountBadge = document.getElementById('comment-count');

    // Load comments
    loadComments();

    // Event listener for comment form submission
    if (commentForm) {
        commentForm.addEventListener('submit', function (e) {
            e.preventDefault();
            submitComment();
        });
    }

    // Event listener for cancel reply button
    if (cancelReplyBtn) {
        cancelReplyBtn.addEventListener('click', function () {
            resetReplyForm();
        });
    }

    // Function to load comments
    function loadComments() {
        fetch(`/api/Comment/news/${newsId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(comments => {
                document.getElementById('comments-loading')?.classList.add('d-none');

                if (!comments || comments.length === 0) {
                    if (noCommentsMessage) noCommentsMessage.classList.remove('d-none');
                    if (commentCountBadge) commentCountBadge.textContent = '0';
                } else {
                    if (noCommentsMessage) noCommentsMessage.classList.add('d-none');

                    // Update comments count
                    let totalComments = comments.length;
                    comments.forEach(comment => {
                        totalComments += (comment.replies?.length || 0);
                    });
                    if (commentCountBadge) commentCountBadge.textContent = totalComments;

                    // Render comments
                    renderComments(comments);
                }
            })
            .catch(error => {
                console.error('Error loading comments:', error);
                if (document.getElementById('comments-loading')) {
                    document.getElementById('comments-loading').classList.add('d-none');
                }
                if (commentsContainer) {
                    commentsContainer.innerHTML = `
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle me-2"></i> Không thể tải bình luận. Vui lòng thử lại sau.
                        </div>
                    `;
                }
            });
    }

    // Function to render comments
    function renderComments(comments) {
        if (!commentsContainer) return;

        commentsContainer.innerHTML = '';

        comments.forEach(comment => {
            const commentElement = createCommentElement(comment, false);
            commentsContainer.appendChild(commentElement);
        });
    }

    // Function to create a comment element with proper author role handling
    function createCommentElement(comment, isReply) {
        const commentDiv = document.createElement('div');
        commentDiv.className = isReply ? 'comment reply mb-1' : 'comment mb-2';
        commentDiv.id = `comment-${comment.commentId}`;

        const avatarColor = stringToColor(comment.author || 'Anonymous');
        const userInitials = getInitials(comment.author || 'Anonymous');
        const timeAgo = formatTimeAgo(new Date(comment.createdAt));

        // Debug log for author comparison
        console.log("Comment author:", comment.author, "Article author:", articleAuthorName);

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
                        <small class="text-muted comment-metadata">${timeAgo}</small>
                    </div>
                    <div class="comment-content">
                        ${comment.content}
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

        // Add event listener for reply button
        setTimeout(() => {
            const replyBtn = commentDiv.querySelector('.reply-btn');
            if (replyBtn) {
                replyBtn.addEventListener('click', function () {
                    setReplyTo(this.dataset.id, this.dataset.author);
                });
            }
        }, 0);

        return commentDiv;
    }

    // Function to submit a comment
    function submitComment() {
        const content = commentContent?.value.trim();
        if (!content) return;

        const commentData = {
            content: content,
            newsId: parseInt(newsId),
            parentCommentId: parentCommentId?.value ? parseInt(parentCommentId.value) : null
        };

        // Add guest information if not authenticated
        const guestNameInput = document.getElementById('guestName');
        const guestEmailInput = document.getElementById('guestEmail');

        if (guestNameInput && guestEmailInput) {
            const guestName = guestNameInput.value.trim();
            const guestEmail = guestEmailInput.value.trim();

            if (!guestName || !guestEmail) {
                showAlert('Vui lòng nhập tên và email để bình luận.', 'warning');
                return;
            }

            commentData.guestName = guestName;
            commentData.guestEmail = guestEmail;
        }

        // Get the token
        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
        if (!token) {
            console.error("Anti-forgery token not found");
            showAlert('Lỗi xác thực, vui lòng làm mới trang và thử lại.', 'danger');
            return;
        }

        // Disable form while submitting
        const submitButton = commentForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang gửi...';
        }

        fetch('/api/Comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify(commentData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Reset form
                    commentForm.reset();

                    // Show success message
                    showAlert('Bình luận của bạn đã được gửi thành công!', 'success');

                    // Handle new comment UI update
                    if (data.comment.isReply && data.comment.parentId) {
                        // Add reply to the parent comment
                        const parentComment = document.getElementById(`comment-${data.comment.parentId}`);
                        if (parentComment) {
                            // Check if replies container exists or create it
                            let repliesContainer = parentComment.querySelector('.replies-container');
                            if (!repliesContainer) {
                                repliesContainer = document.createElement('div');
                                repliesContainer.className = 'replies-container ms-5 mt-3';
                                parentComment.appendChild(repliesContainer);
                            }

                            // Create and add the new reply
                            const replyElement = createCommentElement({
                                commentId: data.comment.commentId,
                                content: data.comment.content,
                                author: data.comment.author,
                                isAuthenticated: data.comment.isAuthenticated,
                                createdAt: data.comment.createdAt,
                                replies: []
                            }, true);

                            repliesContainer.prepend(replyElement);

                            // Update comment count
                            updateCommentCount(1);
                        }
                    } else {
                        // Add new top-level comment
                        const commentElement = createCommentElement({
                            commentId: data.comment.commentId,
                            content: data.comment.content,
                            author: data.comment.author,
                            isAuthenticated: data.comment.isAuthenticated,
                            createdAt: data.comment.createdAt,
                            replies: []
                        }, false);

                        // Add to the top of the comments container
                        if (commentsContainer.firstChild) {
                            commentsContainer.insertBefore(commentElement, commentsContainer.firstChild);
                        } else {
                            commentsContainer.appendChild(commentElement);
                        }

                        // Update comment count
                        updateCommentCount(1);
                        if (noCommentsMessage) noCommentsMessage.classList.add('d-none');
                    }

                    // Reset reply form if needed
                    resetReplyForm();
                } else {
                    showAlert(data.message || 'Có lỗi xảy ra khi gửi bình luận.', 'danger');
                }
            })
            .catch(error => {
                console.error('Error posting comment:', error);
                showAlert('Có lỗi xảy ra khi gửi bình luận. Vui lòng thử lại sau.', 'danger');
            })
            .finally(() => {
                // Re-enable form
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i class="fas fa-paper-plane me-1"></i> Gửi bình luận';
                }
            });
    }

    // Function to update comment count
    function updateCommentCount(increment) {
        if (!commentCountBadge) return;

        const currentCount = parseInt(commentCountBadge.textContent || '0');
        commentCountBadge.textContent = currentCount + increment;
    }

    // Function to set reply to a comment
    function setReplyTo(commentId, author) {
        if (parentCommentId) parentCommentId.value = commentId;
        if (commentContent) {
            commentContent.placeholder = `Đang trả lời ${author}...`;
            commentContent.focus();
        }
        if (cancelReplyBtn) cancelReplyBtn.classList.remove('d-none');

        // Scroll to comment form
        if (commentForm) commentForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Function to reset reply form
    function resetReplyForm() {
        if (parentCommentId) parentCommentId.value = '';
        if (commentContent) commentContent.placeholder = 'Viết bình luận của bạn...';
        if (cancelReplyBtn) cancelReplyBtn.classList.add('d-none');
    }

    // Utility function to show alerts
    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        const container = document.querySelector('.comment-section');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);

            // Auto dismiss after 5 seconds
            setTimeout(() => {
                alertDiv.classList.remove('show');
                setTimeout(() => alertDiv.remove(), 150);
            }, 5000);
        }
    }

    // Utility function to format time ago
    function formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Vừa xong';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;

        return date.toLocaleDateString('vi-VN');
    }

    // Utility function to get user initials
    function getInitials(name) {
        if (!name) return '?';
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    // Utility function to generate color from string
    function stringToColor(str) {
        let hash = 0;
        if (!str) return '#6c757d'; // Default color for null strings

        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }

        return color;
    }
});
