document.addEventListener('DOMContentLoaded', function () {
    // Kiểm tra xem biến viewData có tồn tại không
    if (typeof viewData === 'undefined') {
        console.error('viewData không được định nghĩa. Kiểm tra lại index.cshtml');
        return;
    }

    // Get data passed from the view
    const isAdmin = viewData.isAdmin;
    const sharingData = viewData.sharing;

    console.log('Admin status:', isAdmin);
    console.log('Sharing data:', sharingData);

    // Show toast function
    function showToast(message, type = 'success') {
        const toastContainer = document.querySelector('.toast-container');

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        const iconType = type === 'success' ? 'check-circle' : 'exclamation-circle';
        const titleText = type === 'success' ? 'Thành công' : 'Lỗi';

        toast.innerHTML =
            '<div class="toast-header">' +
            '<strong class="me-auto">' + titleText + '</strong>' +
            '<button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>' +
            '</div>' +
            '<div class="toast-body">' +
            message +
            '</div>';

        toastContainer.appendChild(toast);

        // Initialize the Bootstrap toast
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 3000
        });

        bsToast.show();

        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', function () {
            toastContainer.removeChild(toast);
        });
    }

    // Handle actions for admin
    if (isAdmin) {
        console.log('Admin mode enabled, initializing admin features');

        // Check if needed elements exist
        const createModalElement = document.getElementById('createModal');
        const editModalElement = document.getElementById('editModal');
        const deleteModalElement = document.getElementById('deleteModal');

        if (!createModalElement || !editModalElement || !deleteModalElement) {
            console.error('Modal elements not found. Check HTML.');
            return;
        }

        // Initialize Bootstrap modals
        const createModal = new bootstrap.Modal(createModalElement);
        const editModal = new bootstrap.Modal(editModalElement);
        const deleteModal = new bootstrap.Modal(deleteModalElement);

        // Create button click
        document.getElementById('createBtn').addEventListener('click', function (e) {
            e.preventDefault();
            console.log('Opening create modal');
            createModal.show();
        });

        // Edit button click
        document.getElementById('editBtn').addEventListener('click', function (e) {
            e.preventDefault();
            console.log('Opening edit modal');
            editModal.show();
        });

        // Delete button click
        document.getElementById('deleteBtn').addEventListener('click', function (e) {
            e.preventDefault();
            console.log('Opening delete modal');
            deleteModal.show();
        });

        // Handle create form submission
        document.getElementById('createForm').addEventListener('submit', function (e) {
            e.preventDefault();
            console.log('Create form submitted');

            const formData = {
                newsId: parseInt(document.getElementById('createNewsId').value),
                userId: parseInt(document.getElementById('createUserId').value),
                recipientEmail: document.getElementById('createRecipientEmail').value,
                message: document.getElementById('createMessage').value,
                isRead: document.getElementById('createIsRead').checked,
                shareDate: new Date().toISOString()
            };

            // Get anti-forgery token if available
            const tokenElement = document.querySelector('input[name="__RequestVerificationToken"]');
            const tokenValue = tokenElement ? tokenElement.value : null;

            // Prepare headers
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add token if available
            if (tokenValue) {
                headers['RequestVerificationToken'] = tokenValue;
            }

            console.log('Sending create request with data:', formData);

            // AJAX call to create
            fetch('/SharingView/Create', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(formData)
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Create response:', data);
                    if (data.success) {
                        createModal.hide();
                        showToast('Đã tạo chia sẻ mới thành công');

                        // Reset form
                        document.getElementById('createForm').reset();

                        // Reload after delay
                        setTimeout(function () {
                            location.reload();
                        }, 1500);
                    } else {
                        showToast(data.message || 'Có lỗi xảy ra', 'error');
                    }
                })
                .catch(error => {
                    console.error('Create error:', error);
                    showToast('Đã xảy ra lỗi khi xử lý yêu cầu', 'error');
                });
        });

        // Handle edit form submission
        document.getElementById('editForm').addEventListener('submit', function (e) {
            e.preventDefault();
            console.log('Edit form submitted');

            const formData = {
                id: parseInt(document.getElementById('editId').value),
                newsId: parseInt(document.getElementById('editNewsId').value),
                userId: parseInt(document.getElementById('editUserId').value),
                recipientEmail: document.getElementById('editRecipientEmail').value,
                message: document.getElementById('editMessage').value,
                isRead: document.getElementById('editIsRead').checked,
                shareDate: sharingData.shareDate // Use the value from viewData
            };

            // Get anti-forgery token if available
            const tokenElement = document.querySelector('input[name="__RequestVerificationToken"]');
            const tokenValue = tokenElement ? tokenElement.value : null;

            // Prepare headers
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add token if available
            if (tokenValue) {
                headers['RequestVerificationToken'] = tokenValue;
            }

            console.log('Sending edit request with data:', formData);

            // AJAX call to edit
            fetch('/SharingView/Edit', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(formData)
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Edit response:', data);
                    if (data.success) {
                        editModal.hide();
                        showToast('Đã cập nhật chia sẻ thành công');

                        // Reload after delay
                        setTimeout(function () {
                            location.reload();
                        }, 1500);
                    } else {
                        showToast(data.message || 'Có lỗi xảy ra', 'error');
                    }
                })
                .catch(error => {
                    console.error('Edit error:', error);
                    showToast('Đã xảy ra lỗi khi xử lý yêu cầu', 'error');
                });
        });

        // Handle delete confirmation
        document.getElementById('confirmDelete').addEventListener('click', function () {
            console.log('Delete confirmed for ID:', sharingData.id);

            // Get anti-forgery token if available
            const tokenElement = document.querySelector('input[name="__RequestVerificationToken"]');
            const tokenValue = tokenElement ? tokenElement.value : null;

            // Prepare headers
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add token if available
            if (tokenValue) {
                headers['RequestVerificationToken'] = tokenValue;
            }

            // AJAX call to delete
            fetch('/SharingView/Delete', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(sharingData.id)
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Delete response:', data);
                    if (data.success) {
                        deleteModal.hide();
                        showToast('Đã xóa chia sẻ thành công');

                        // Redirect after successful deletion
                        setTimeout(function () {
                            window.location.href = '/';
                        }, 1500);
                    } else {
                        showToast(data.message || 'Có lỗi xảy ra', 'error');
                    }
                })
                .catch(error => {
                    console.error('Delete error:', error);
                    showToast('Đã xảy ra lỗi khi xử lý yêu cầu', 'error');
                });
        });
    }

    // Refresh button - for all users
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log('Refreshing page');
            location.reload();
            showToast('Đã làm mới dữ liệu');
        });
    }

    // Export button - for all users
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log('Exporting data');

            // Use data from viewData
            const data = sharingData;

            // Convert to JSON and encode
            const jsonStr = JSON.stringify(data, null, 2);
            const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(jsonStr);

            // Create and trigger download
            const exportLink = document.createElement('a');
            exportLink.setAttribute('href', dataUri);
            exportLink.setAttribute('download', 'news-sharing-data.json');
            document.body.appendChild(exportLink);
            exportLink.click();
            document.body.removeChild(exportLink);

            showToast('Đã xuất dữ liệu thành công');
        });
    }
});
