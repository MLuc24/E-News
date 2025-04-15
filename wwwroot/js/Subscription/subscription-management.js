// Subscription management scripts
$(document).ready(function () {
    // Initialize components and bind events
    initializeSubscriptionManagement();

    // For debugging purposes
    console.log("Subscription management script loaded");
});

function initializeSubscriptionManagement() {
    // Bind delete confirmation
    $('.delete-subscription-btn').on('click', function () {
        const id = $(this).data('id');
        const email = $(this).data('email');
        confirmDeleteSubscription(id, email);
    });

    // Bind test email sending
    $('.test-email-btn').on('click', function () {
        const email = $(this).data('email');
        $('#testEmailInput').val(email);
        $('#testEmailModal').modal('show');
    });

    // Send test email button in modal
    $('#sendTestEmailBtn').on('click', function () {
        const email = $('#testEmailInput').val();
        sendTestEmail(email);
    });

    // Setup CSV file upload validation
    $('#importSubscriptionsForm').on('submit', function (e) {
        const fileInput = document.getElementById('csvFileInput');
        if (!fileInput.files.length) {
            e.preventDefault();
            showToast('error', 'Vui lòng chọn file CSV để nhập');
        }
    });
}

function confirmDeleteSubscription(id, email) {
    if (!id || isNaN(id)) {
        showToast('error', 'ID đăng ký không hợp lệ');
        return;
    }

    $('.subscription-email').text(email);
    $('#deleteSubscriptionModal').data('id', id);
    $('#deleteSubscriptionModal').modal('show');

    // When confirmation button is clicked
    $('#confirmDeleteBtn').off('click').on('click', function () {
        deleteSubscription(id);
    });
}

function deleteSubscription(id) {
    // Show loading state
    $('#confirmDeleteBtn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...');

    // Get the antiforgery token
    const token = $('#diagnosticEmailForm input[name="__RequestVerificationToken"]').val();

    console.log("Attempting to delete subscription with ID:", id);
    console.log("Using route:", `/Admin/Subscription/DeleteSubscription/${id}`);

    $.ajax({
        url: `/Admin/Subscription/DeleteSubscription/${id}`,
        type: 'POST',
        headers: {
            'RequestVerificationToken': token
        },
        success: function (result) {
            $('#deleteSubscriptionModal').modal('hide');
            showToast('success', 'Đã xóa đăng ký thành công');

            // Reload the page after a short delay to show the updated list
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        },
        error: function (xhr, status, error) {
            console.error("Delete subscription error:", error);
            console.error("Response:", xhr.responseText);
            console.error("Status:", xhr.status);

            let errorMessage = 'Có lỗi xảy ra khi xóa đăng ký';
            if (xhr.status === 404) {
                errorMessage = 'Không tìm thấy thông tin đăng ký này';
            }

            $('#deleteSubscriptionModal').modal('hide');
            showToast('error', errorMessage);
        },
        complete: function () {
            $('#confirmDeleteBtn').prop('disabled', false).html('<i class="fas fa-trash-alt me-2"></i>Xóa');
        }
    });
}

function sendTestEmail(email) {
    if (!validateEmail(email)) {
        showToast('error', 'Địa chỉ email không hợp lệ');
        return;
    }

    // Show loading state
    $('#sendTestEmailBtn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang gửi...');

    // Get the antiforgery token
    const token = $('#diagnosticEmailForm input[name="__RequestVerificationToken"]').val();

    $.ajax({
        url: '/Admin/Subscription/SendTestEmail',
        type: 'POST',
        headers: {
            'RequestVerificationToken': token
        },
        data: { email: email },
        success: function (result) {
            $('#testEmailModal').modal('hide');

            if (result.success) {
                showToast('success', result.message);
            } else {
                showToast('error', result.message);
            }
        },
        error: function (xhr, status, error) {
            console.error("Send test email error:", error);
            console.error("Response:", xhr.responseText);
            $('#testEmailModal').modal('hide');
            showToast('error', 'Có lỗi xảy ra khi gửi email kiểm tra');
        },
        complete: function () {
            $('#sendTestEmailBtn').prop('disabled', false).html('<i class="fas fa-envelope me-2"></i>Gửi email kiểm tra');
        }
    });
}

function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
}

function showToast(type, message) {
    const toastClass = type === 'success' ? 'bg-success text-white' : 'bg-danger text-white';
    const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';

    const toast = `
                <div class="toast ${toastClass}" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header">
                        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                        <strong class="me-auto">${type === 'success' ? 'Thành công' : 'Lỗi'}</strong>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                    <div class="toast-body">
                        ${message}
                    </div>
                </div>
            `;

    $('#toastContainer').append(toast);
    const toastElement = $('.toast').last();
    const bsToast = new bootstrap.Toast(toastElement, { delay: 5000 });
    bsToast.show();

    // Auto remove toast after it's hidden
    toastElement.on('hidden.bs.toast', function () {
        $(this).remove();
    });
}
