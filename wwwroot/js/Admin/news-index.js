// wwwroot/js/Admin/news-index.js

function showDetailsModal(newsId) {
    $.ajax({
        url: '/AdminNews/GetNewsDetails/' + newsId,  // Changed from News to AdminNews
        type: 'GET',
        success: function (result) {
            if (result.success) {
                // Cập nhật thông tin cơ bản
                $('#detailsTitle').text(result.title);

                // Enhanced header with better styling
                $('#detailsModalHeader').html(`
                    <div class="news-detail-header">
                        <div class="header-category">
                            <span class="category-badge">${result.categoryName}</span>
                        </div>
                        <h2 class="modal-title fs-4" id="newsDetailsModalLabel">Chi tiết tin tức</h2>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                `);

                // Cập nhật meta info với thêm thông tin phong phú
                $('#detailsMeta').html(`
                    <div class="meta-info">
                        <span class="meta-time"><i class="fas fa-clock"></i> ${result.createdAt}</span>
                        <span class="meta-author"><i class="fas fa-user-edit"></i> ${result.authorFullName}</span>
                        <span class="meta-status">
                            ${result.isApproved ?
                        '<i class="fas fa-check-circle text-success"></i> Đã duyệt' :
                        '<i class="fas fa-hourglass-half text-warning"></i> Chờ duyệt'}
                        </span>
                    </div>
                `);

                // Xử lý hình ảnh
                if (result.imageUrl && !result.content.includes(result.imageUrl)) {
                    $('#detailsImageContainer').html('<img src="' + result.imageUrl + '" alt="Ảnh minh họa" class="img-fluid rounded shadow-sm news-detail-img">');
                } else {
                    $('#detailsImageContainer').html('');
                }

                // Hiển thị nội dung
                $('#detailsContent').html(result.content);

                // Hiển thị trạng thái phê duyệt
                if (result.isApproved) {
                    $('#detailsApprovalStatus').html('<i class="fas fa-check me-1"></i> Đã duyệt').removeClass('bg-warning text-dark').addClass('bg-success');
                } else {
                    $('#detailsApprovalStatus').html('<i class="fas fa-clock me-1"></i> Chờ duyệt').removeClass('bg-success').addClass('bg-warning text-dark');
                }

                // Hiển thị danh mục
                $('#detailsCategory').html('📌 Danh mục: ' + result.categoryName);

                // Xử lý các nút hành động - Removed edit button
                let actionsHtml = `
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        <i class="fas fa-arrow-left"></i> Quay lại danh sách
                    </button>
                `;

                // Nếu bài viết chưa được duyệt, hiển thị nút duyệt (chỉ nếu có quyền admin)
                if (!result.isApproved) {
                    actionsHtml += `
                        <button type="button" class="btn btn-success ms-2" onclick="showApproveModalFromDetails(${result.newsId})">
                            <i class="fas fa-check"></i> Duyệt bài viết
                        </button>
                    `;
                }

                $('#detailsActions').html(actionsHtml);

                // Hiển thị modal
                var detailsModal = new bootstrap.Modal(document.getElementById('newsDetailsModal'));
                detailsModal.show();

                // Lưu ID bài viết hiện tại để sử dụng sau này
                $('#currentNewsId').val(result.newsId);
            } else {
                showToast(result.message || 'Không thể tải chi tiết tin tức', 'danger');
            }
        },
        error: function (xhr, status, error) {
            showToast('Không thể tải chi tiết tin tức: ' + error, 'danger');
        }
    });
}

function showApproveModalFromDetails(newsId) {
    // Đóng modal chi tiết trước khi hiển thị modal duyệt
    var detailsModal = bootstrap.Modal.getInstance(document.getElementById('newsDetailsModal'));
    if (detailsModal) {
        detailsModal.hide();
    }

    // Gọi hàm hiển thị modal duyệt
    setTimeout(function () {
        showApproveModal(newsId);
    }, 500); // Đợi modal chi tiết đóng hoàn toàn
}

// Corrected deleteNews function
function deleteNews() {
    var newsId = $('#deleteNewsId').val();
    var token = document.querySelector('input[name="__RequestVerificationToken"]').value;

    fetch('/AdminNews/Delete/' + newsId, {
        method: 'POST',
        headers: {
            'RequestVerificationToken': token,
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                // Hide the modal
                var deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
                deleteModal.hide();

                // Show success message
                showToast('Xóa thành công!', 'success');

                // Remove the deleted item from the DOM
                var row = document.getElementById('news-' + newsId);
                if (row) {
                    row.style.opacity = '0';
                    setTimeout(() => row.remove(), 300);
                }

                // Update counts
                var totalCount = parseInt($('#totalNewsCount').text()) - 1;
                $('#totalNewsCount').text(totalCount);

                if (result.wasApproved) {
                    var approvedCount = parseInt($('#approvedCount').text()) - 1;
                    $('#approvedCount').text(approvedCount);
                } else {
                    var pendingCount = parseInt($('#pendingCount').text()) - 1;
                    $('#pendingCount').text(pendingCount);
                }
            } else {
                showToast(result.message || 'Xóa thất bại', 'danger');
            }
        })
        .catch(error => {
            showToast('Xóa thất bại: ' + error, 'danger');
        });
}

function showDeleteModal(newsId) {
    $.ajax({
        url: '/AdminNews/GetNewsDetailsForDelete/' + newsId,  // Changed from News to AdminNews
        type: 'GET',
        success: function (result) {
            $('#newsTitle').text(result.title);
            $('#newsDetails').text('🕒 ' + result.createdAt + ' | 🖊️ Tác giả: ' + result.authorFullName);

            const imageContainer = document.getElementById('newsImageContainer');
            imageContainer.innerHTML = result.imageUrl ?
                `<img src="${result.imageUrl}" alt="Ảnh minh họa" class="img-fluid rounded shadow-sm animate-image" style="max-height: 200px; object-fit: cover;">` : '';

            $('#deleteNewsId').val(newsId);

            var deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
            deleteModal.show();
        },
        error: function (xhr, status, error) {
            showToast('Không thể tải chi tiết tin tức: ' + error, 'danger');
        }
    });
}

function showApproveModal(newsId) {
    $.ajax({
        url: '/AdminNews/GetNewsDetailsForDelete/' + newsId,  // Changed from News to AdminNews
        type: 'GET',
        success: function (result) {
            // Cập nhật UI với thông tin phong phú hơn
            $('#approveNewsTitle').text(result.title);

            // Thêm thông tin chi tiết
            $('#approveNewsDetails').html(`
                <div class="approve-meta">
                    <span><i class="fas fa-clock text-primary"></i> ${result.createdAt}</span>
                    <span><i class="fas fa-user-edit text-info"></i> ${result.authorFullName}</span>
                    <span><i class="fas fa-folder text-warning"></i> ${result.categoryName}</span>
                </div>
            `);

            if (result.imageUrl) {
                $('#approveNewsImageContainer').html('<img src="' + result.imageUrl + '" alt="Ảnh minh họa" class="img-fluid rounded shadow-sm animate-image" style="max-height: 300px; object-fit: cover;">');
            } else {
                $('#approveNewsImageContainer').html('');
            }
            $('#approveNewsId').val(newsId);
            var approveModal = new bootstrap.Modal(document.getElementById('approveModal'));
            approveModal.show();
        },
        error: function (xhr, status, error) {
            showToast('Không thể tải chi tiết tin tức: ' + error, 'danger');
        }
    });
}

function approveNews() {
    var newsId = $('#approveNewsId').val();
    var token = document.querySelector('input[name="__RequestVerificationToken"]').value;

    fetch('/AdminNews/Approve/' + newsId, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'RequestVerificationToken': token
        }
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                var approveModal = bootstrap.Modal.getInstance(document.getElementById('approveModal'));
                approveModal.hide();
                showToast('Duyệt thành công!', 'success');

                // Cập nhật UI thay vì tải lại trang
                var row = $('#news-' + newsId);
                row.find('td:nth-child(2)').html('<span class="badge bg-success"><i class="fas fa-check me-1"></i> Đã duyệt</span>');
                row.find('button.btn-success').remove(); // Xóa nút duyệt
            } else {
                showToast(result.message || 'Duyệt thất bại', 'danger');
            }
        })
        .catch(error => {
            showToast('Duyệt thất bại: ' + error, 'danger');
        });
}

function showToast(message, type) {
    var toast = document.getElementById('actionToast');
    toast.classList.remove('bg-success', 'bg-danger');
    toast.classList.add(type === 'danger' ? 'bg-danger' : 'bg-success');
    document.getElementById('toastMessage').textContent = message;
    var bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}
