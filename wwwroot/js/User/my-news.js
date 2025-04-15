// wwwroot/js/User/my-news.js

document.addEventListener('DOMContentLoaded', function () {
    // View toggle functionality
    const cardViewBtn = document.getElementById('cardViewBtn');
    const tableViewBtn = document.getElementById('tableViewBtn');
    const cardView = document.getElementById('cardView');
    const tableView = document.getElementById('tableView');

    if (cardViewBtn) {
        cardViewBtn.addEventListener('click', function () {
            cardView.style.display = 'grid';
            tableView.style.display = 'none';
            cardViewBtn.classList.add('active');
            tableViewBtn.classList.remove('active');
        });
    }

    if (tableViewBtn) {
        tableViewBtn.addEventListener('click', function () {
            cardView.style.display = 'none';
            tableView.style.display = 'block';
            tableViewBtn.classList.add('active');
            cardViewBtn.classList.remove('active');
        });
    }

    // Search & filter functionality
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');

    function filterNews() {
        if (!searchInput || !statusFilter) return;

        const searchTerm = searchInput.value.toLowerCase();
        const status = statusFilter.value;

        // Filter card view
        document.querySelectorAll('.news-card').forEach(card => {
            const title = card.querySelector('.news-card-title').textContent.toLowerCase();
            const badge = card.querySelector('.badge');

            let statusMatch = status === 'all';
            if (badge.classList.contains('bg-success')) statusMatch = status === 'approved';
            if (badge.classList.contains('bg-warning')) statusMatch = status === 'pending';
            if (badge.classList.contains('bg-secondary')) statusMatch = status === 'archived';
            if (badge.classList.contains('bg-danger')) statusMatch = status === 'expired';

            card.style.display = (title.includes(searchTerm) && statusMatch) ? 'block' : 'none';
        });

        // Filter table view
        document.querySelectorAll('.my-news-table tbody tr').forEach(row => {
            const title = row.cells[0].textContent.toLowerCase();
            const badge = row.cells[1].querySelector('.badge');

            let statusMatch = status === 'all';
            if (badge.classList.contains('bg-success')) statusMatch = status === 'approved';
            if (badge.classList.contains('bg-warning')) statusMatch = status === 'pending';
            if (badge.classList.contains('bg-secondary')) statusMatch = status === 'archived';
            if (badge.classList.contains('bg-danger')) statusMatch = status === 'expired';

            row.style.display = (title.includes(searchTerm) && statusMatch) ? 'table-row' : 'none';
        });
    }

    if (searchInput) searchInput.addEventListener('input', filterNews);
    if (statusFilter) statusFilter.addEventListener('change', filterNews);

    // Apply hover effect to all action buttons
    document.querySelectorAll('.action-buttons .btn, .my-news-action-buttons .btn')
        .forEach(btn => btn.classList.add('btn-hover-effect'));

    // Set up CSRF token if not present
    if (!document.querySelector('input[name="__RequestVerificationToken"]')) {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
            const tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = '__RequestVerificationToken';
            tokenInput.value = csrfToken;
            document.body.appendChild(tokenInput);
        }
    }

    // Set up confirm button handlers
    setupConfirmHandlers();
});

function setupConfirmHandlers() {
    // Set up confirm button for delete
    const confirmDeleteButton = document.getElementById('confirmDeleteButton');
    if (confirmDeleteButton) {
        confirmDeleteButton.onclick = function () {
            const id = document.getElementById('deleteNewsId').value;
            const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

            fetch('/UserNews/DeleteConfirmed/' + id, { // Updated from News to UserNews
                method: 'POST',
                headers: {
                    'RequestVerificationToken': token,
                    'Content-Type': 'application/json'
                }
            })
                .then(response => {
                    if (response.ok) {
                        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
                        showToast('Xóa tin tức thành công!', 'success');
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        return response.json().then(data => Promise.reject(data.message || 'Xóa thất bại'));
                    }
                })
                .catch(error => showToast('Có lỗi xảy ra khi xóa: ' + error, 'danger'));
        };
    }

    // Set up confirm button for archive
    const confirmCancelButton = document.getElementById('confirmCancelButton');
    if (confirmCancelButton) {
        confirmCancelButton.onclick = function () {
            const id = document.getElementById('cancelNewsId').value;
            const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

            fetch('/UserNews/Archive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'RequestVerificationToken': token
                },
                body: `id=${encodeURIComponent(id)}`
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
        };
    }

    // Set up confirm button for repost
    const confirmRepostButton = document.getElementById('confirmRepostButton');
    if (confirmRepostButton) {
        confirmRepostButton.onclick = function () {
            const id = document.getElementById('repostNewsId').value;
            const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

            fetch('/UserNews/Repost/' + id, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': token
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
        };
    }
}

// Function to show delete confirmation modal
function showDeleteModal(newsId) {
    fetch('/UserNews/GetNewsDetailsForDelete/' + newsId)  // Make sure this endpoint exists in UserNewsController
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('newsTitle').textContent = data.title;
            document.getElementById('newsDetails').textContent = '🕒 ' + data.createdAt + ' | 🖊️ Tác giả: ' + data.authorFullName;

            const imageContainer = document.getElementById('newsImageContainer');
            imageContainer.innerHTML = data.imageUrl ?
                `<img src="${data.imageUrl}" alt="Ảnh minh họa" class="img-fluid rounded shadow-sm animate-image" style="max-height: 200px; object-fit: cover;">` : '';

            document.getElementById('deleteNewsId').value = newsId;
            if (document.querySelector('.icon-spin')) {
                document.querySelector('.icon-spin').classList.add('fa-spin');
                setTimeout(() => document.querySelector('.icon-spin').classList.remove('fa-spin'), 2000);
            }

            new bootstrap.Modal(document.getElementById('deleteModal')).show();
        })
        .catch(error => {
            console.error('Error fetching news details:', error);
            showToast('Không thể tải chi tiết tin tức: ' + error, 'danger');
        });
}

// Function to show cancel confirmation modal
// Function to show cancel confirmation modal
function showCancelModal(newsId) {
    fetch('/UserNews/GetNewsDetailsForDelete/' + newsId)  // Make sure this endpoint exists in UserNewsController
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('cancelNewsTitle').textContent = data.title;
            document.getElementById('cancelNewsDetails').textContent = '🕒 ' + data.createdAt + ' | Tin đang chờ duyệt';

            // Add image if available
            const imageContainer = document.getElementById('cancelNewsImageContainer');
            if (imageContainer) {
                imageContainer.innerHTML = data.imageUrl ?
                    `<img src="${data.imageUrl}" alt="Ảnh minh họa" class="img-fluid rounded shadow-sm" style="max-height: 150px; object-fit: cover;">` : '';
            }

            document.getElementById('cancelNewsId').value = newsId;

            // Show the modal
            new bootstrap.Modal(document.getElementById('cancelModal')).show();
        })
        .catch(error => {
            console.error('Error fetching news details:', error);
            showToast('Không thể tải chi tiết tin tức: ' + error, 'danger');
        });
}

// Function to show archived/expired news details
function showArchivedNewsDetails(newsId, type) {
    fetch('/UserNews/GetArchivedNewsDetails/' + newsId)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('archivedNewsTitle').textContent = data.title;
                document.getElementById('archivedNewsCategory').textContent = data.categoryName;

                const header = document.getElementById('archivedNewsHeader');
                header.classList.remove('modal-header-archive', 'modal-header-repost');

                if (type === 'expired') {
                    header.classList.add('modal-header-repost');
                    document.getElementById('archivedNewsModalLabel').innerHTML = '<i class="fas fa-history me-2"></i> Chi tiết tin hết hạn';

                    // Add repost button to footer
                    document.getElementById('archivedNewsFooter').innerHTML = `
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-1"></i> Đóng
                        </button>
                        <button type="button" class="btn btn-primary btn-hover-effect ms-2" onclick="showRepostModal(${data.newsId})">
                            <i class="fas fa-redo me-1"></i> Đăng lại
                        </button>
                    `;
                } else {
                    header.classList.add('modal-header-archive');
                    document.getElementById('archivedNewsModalLabel').innerHTML = '<i class="fas fa-archive me-2"></i> Chi tiết tin lưu trữ';

                    // Standard close button only
                    document.getElementById('archivedNewsFooter').innerHTML = `
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-1"></i> Đóng
                        </button>
                    `;
                }

                // Set image if available
                const imageContainer = document.getElementById('archivedNewsImageContainer');
                imageContainer.innerHTML = data.imageUrl ?
                    `<img src="${data.imageUrl}" alt="Ảnh minh họa" class="img-fluid rounded shadow animate-image" style="max-height: 300px; object-fit: cover;">` : '';

                document.getElementById('archivedNewsContent').innerHTML = data.content;

                new bootstrap.Modal(document.getElementById('archivedNewsModal')).show();
            } else {
                showToast(data.message || 'Không thể tải chi tiết tin tức', 'danger');
            }
        })
        .catch(error => showToast('Không thể tải chi tiết tin tức: ' + error, 'danger'));
}

// Function to show repost confirmation modal
function showRepostModal(newsId) {
    const archivedModal = bootstrap.Modal.getInstance(document.getElementById('archivedNewsModal'));
    if (archivedModal) archivedModal.hide();

    fetch('/UserNews/GetArchivedNewsDetails/' + newsId) // Updated from News to UserNews
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('repostNewsTitle').textContent = data.title;
                document.getElementById('repostNewsId').value = data.newsId;

                setTimeout(() => {
                    new bootstrap.Modal(document.getElementById('repostModal')).show();
                }, 500);
            } else {
                showToast(data.message || 'Không thể tải chi tiết tin tức', 'danger');
            }
        })
        .catch(error => showToast('Không thể tải chi tiết tin tức: ' + error, 'danger'));
}

// Function to show toast notifications
function showToast(message, type) {
    const toast = document.getElementById('successToast');
    toast.classList.remove('bg-success', 'bg-danger');
    toast.classList.add(type === 'danger' ? 'bg-danger' : 'bg-success');
    document.getElementById('toastMessage').textContent = message;
    new bootstrap.Toast(toast).show();
}
