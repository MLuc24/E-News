// comment-role.js - Handles author role display in comments

document.addEventListener('DOMContentLoaded', function () {
    // Get the article author name from the page metadata
    const articleAuthorName = document.querySelector('meta[name="article-author"]')?.getAttribute('content');
    // Add specific author name for Văn Ca
    const vanCaAuthor = "Văn Ca";

    console.log("Article author from metadata:", articleAuthorName);

    // Wait for the original comment.js to load first
    setTimeout(function () {
        // Make sure the original functions are available in the window scope
        window.createCommentElement = window.createCommentElement || createCommentElement;
        window.stringToColor = window.stringToColor || stringToColor;
        window.getInitials = window.getInitials || getInitials;
        window.formatTimeAgo = window.formatTimeAgo || formatTimeAgo;
        window.setReplyTo = window.setReplyTo || setReplyTo;

        // Override the createCommentElement function
        if (typeof window.createCommentElement !== 'undefined') {
            window.originalCreateCommentElement = window.createCommentElement;

            window.createCommentElement = function (comment, isReply) {
                const commentDiv = document.createElement('div');
                commentDiv.className = isReply ? 'comment reply mb-1' : 'comment mb-2';
                commentDiv.id = `comment-${comment.commentId}`;

                const avatarColor = window.stringToColor(comment.author || 'Anonymous');
                const userInitials = window.getInitials(comment.author || 'Anonymous');
                const timeAgo = window.formatTimeAgo(new Date(comment.createdAt));

                console.log("Comment author:", comment.author, "Article author:", articleAuthorName);

                // Determine the appropriate badge based on the author's role
                let authorBadge;

                // IMPORTANT: First check for exact match with "Văn Ca"
                if (comment.author === vanCaAuthor || comment.author === "Văn Ca" ||
                    comment.author?.trim() === "Văn Ca") {
                    authorBadge = `<span class="badge badge-author ms-2 comment-author-role">Tác giả</span>`;
                }
                // Then check if the comment author matches the article author from metadata
                else if (articleAuthorName && comment.author === articleAuthorName) {
                    authorBadge = `<span class="badge badge-author ms-2 comment-author-role">Tác giả</span>`;
                }
                // Otherwise use normal classification
                else if (comment.isAuthenticated) {
                    authorBadge = `<span class="badge badge-member ms-2 comment-author-role">Thành viên</span>`;
                } else {
                    authorBadge = `<span class="badge badge-guest ms-2 comment-author-role">Khách</span>`;
                }

                // Comment with increased font size (by 50%)
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
                        const replyElement = window.createCommentElement(reply, true);
                        repliesContainer.appendChild(replyElement);
                    });

                    commentDiv.appendChild(repliesContainer);
                }

                // Add event listener for reply button
                setTimeout(() => {
                    const replyBtn = commentDiv.querySelector('.reply-btn');
                    if (replyBtn) {
                        replyBtn.addEventListener('click', function () {
                            window.setReplyTo(this.dataset.id, this.dataset.author);
                        });
                    }
                }, 0);

                return commentDiv;
            };
        }
    }, 300);
});
