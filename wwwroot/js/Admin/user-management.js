// user-management.js - updated version with professional confirmation modals

document.addEventListener('DOMContentLoaded', function () {
    // Edit User functionality
    const editUserLinks = document.querySelectorAll('.edit-user-btn');
    if (editUserLinks) {
        editUserLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const userId = this.getAttribute('data-user-id');
                fetchUserForEdit(userId);
            });
        });
    }

    // Initialize modal event handlers
    initializeModals();

    // Initialize confirmation modal
    createConfirmationModal();
});

// Create confirmation modal dynamically with enhanced styling
function createConfirmationModal() {
    // Create the confirmation modal with enhanced styling
    const modalHtml = `
        <div class="modal fade" id="confirmationModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div id="confirmationModalHeader" class="modal-header">
                        <h5 class="modal-title" id="confirmationTitle"></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body pt-4 pb-4">
                        <div class="d-flex align-items-center mb-3">
                            <span id="confirmationIcon" class="me-3 fs-1 text-center"></span>
                            <p id="confirmationMessage" class="mb-0 fs-5"></p>
                        </div>
                    </div>
                    <div class="modal-footer bg-light">
                        <button type="button" class="btn btn-outline-secondary px-4" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Hủy
                        </button>
                        <button type="button" id="confirmButton" class="btn px-4">
                            <i id="confirmButtonIcon" class="fas me-2"></i><span id="confirmButtonText"></span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <style>
            #confirmationModal .modal-header.delete-header {
                background: linear-gradient(135deg, #ff4b4b, #d10000);
                color: white;
            }
            
            #confirmationModal .modal-header.restore-header {
                background: linear-gradient(135deg, #28a745, #218838);
                color: white;
            }
            
            #confirmationModal .modal-header.reset-header {
                background: linear-gradient(135deg, #ffc107, #d39e00);
                color: white;
            }
            
            #confirmationModal .modal-content {
                border-radius: 10px;
                overflow: hidden;
            }
            
            #confirmationModal .modal-title {
                font-weight: 600;
                display: flex;
                align-items: center;
            }
            
            #confirmationModal .modal-title i {
                margin-right: 10px;
            }
            
            #confirmationModal #confirmationMessage {
                line-height: 1.5;
            }
            
            #confirmationModal .modal-footer {
                border-top: 1px solid rgba(0,0,0,0.1);
            }
        </style>
    `;

    // Add the modal to the body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
}

// Show the confirmation modal with enhanced styling
function showConfirmation(options) {
    const modal = document.getElementById('confirmationModal');
    const modalHeader = document.getElementById('confirmationModalHeader');
    const title = document.getElementById('confirmationTitle');
    const message = document.getElementById('confirmationMessage');
    const confirmButton = document.getElementById('confirmButton');
    const confirmButtonText = document.getElementById('confirmButtonText');
    const confirmButtonIcon = document.getElementById('confirmButtonIcon');
    const confirmationIcon = document.getElementById('confirmationIcon');

    // Set header style based on action type
    modalHeader.className = 'modal-header';
    if (options.type === 'delete') {
        modalHeader.classList.add('delete-header');
        confirmationIcon.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i>';
        confirmButtonIcon.className = 'fas fa-trash-alt me-2';
    } else if (options.type === 'restore') {
        modalHeader.classList.add('restore-header');
        confirmationIcon.innerHTML = '<i class="fas fa-trash-restore text-success"></i>';
        confirmButtonIcon.className = 'fas fa-trash-restore me-2';
    } else if (options.type === 'reset') {
        modalHeader.classList.add('reset-header');
        confirmationIcon.innerHTML = '<i class="fas fa-key text-warning"></i>';
        confirmButtonIcon.className = 'fas fa-key me-2';
    }

    // Set modal content
    title.innerHTML = options.title;
    message.innerHTML = options.message;
    confirmButton.className = `btn ${options.buttonClass} px-4`;
    confirmButtonText.textContent = options.buttonText;

    // Set up the confirm button event
    confirmButton.onclick = function () {
        // Hide the modal
        bootstrap.Modal.getInstance(modal).hide();

        // Call the callback function
        if (options.onConfirm) {
            options.onConfirm();
        }
    };

    // Show the modal with fade effect
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

// Fetch user data for editing
function fetchUserForEdit(userId) {
    fetch(`/AdminUser/GetUserData/${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            populateEditForm(data);
            // Show the edit modal
            const editModal = new bootstrap.Modal(document.getElementById('editUserModal'));
            editModal.show();
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            showToast('error', 'Không thể tải thông tin người dùng');
        });
}

// Populate the edit form with user data
function populateEditForm(userData) {
    document.getElementById('edit-userId').value = userData.userId;
    document.getElementById('edit-fullName').value = userData.fullName;
    document.getElementById('edit-email').value = userData.email;

    // Make sure alert is hidden and ready for potential errors
    const alertElement = document.getElementById('edit-alert');
    if (alertElement) {
        alertElement.style.display = 'none';
    }
}

// Submit user edit form
function submitEditForm(event) {
    event.preventDefault();

    const formElement = document.getElementById('editUserForm');
    const formData = new FormData(formElement);

    // Get the CSRF token
    const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

    // Create JSON payload
    const userData = {
        userId: parseInt(formData.get('UserId')),
        fullName: formData.get('FullName'),
        email: formData.get('Email'),
        changePassword: document.getElementById('changePasswordCheck').checked,
        newPassword: formData.get('NewPassword') || null
    };

    // Validate form
    if (!userData.fullName || !userData.email) {
        showToast('error', 'Vui lòng điền đủ thông tin');
        return;
    }

    if (userData.changePassword && !userData.newPassword) {
        showToast('error', 'Vui lòng nhập mật khẩu mới');
        return;
    }

    fetch('/AdminUser/Edit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': token
        },
        body: JSON.stringify(userData)
    })
        .then(response => response.json().then(data => ({ status: response.status, body: data })))
        .then(({ status, body }) => {
            if (status >= 200 && status < 300) {
                // Success
                bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
                showToast('success', 'Cập nhật người dùng thành công');

                // Update the user data in the table
                updateUserRow(userData);
            } else {
                // Error
                throw new Error(body.message || 'Có lỗi xảy ra');
            }
        })
        .catch(error => {
            console.error('Error updating user:', error);
            showToast('error', 'Cập nhật thất bại: ' + (error.message || 'Có lỗi xảy ra'));
        });
}

// Create new user
function submitCreateForm(event) {
    event.preventDefault();

    const formElement = document.getElementById('createUserForm');
    const alertElement = document.getElementById('create-alert');

    // Clear previous error messages
    alertElement.style.display = 'none';
    alertElement.textContent = '';
    formElement.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    // Get form data
    const formData = new FormData(formElement);

    // Get values
    const fullName = formData.get('FullName').trim();
    const email = formData.get('Email').trim();
    const password = formData.get('Password');

    // Validate input
    let isValid = true;
    let errorMessages = [];

    // Validate full name
    if (!fullName) {
        document.getElementById('create-fullName').classList.add('is-invalid');
        errorMessages.push('Họ và tên không được để trống');
        isValid = false;
    }

    // Validate email
    if (!email) {
        document.getElementById('create-email').classList.add('is-invalid');
        errorMessages.push('Email không được để trống');
        isValid = false;
    } else if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        document.getElementById('create-email').classList.add('is-invalid');
        errorMessages.push('Email không đúng định dạng');
        isValid = false;
    }

    // Validate password
    if (!password) {
        document.getElementById('create-password').classList.add('is-invalid');
        errorMessages.push('Mật khẩu không được để trống');
        isValid = false;
    } else if (password.length < 6 || password.length > 8) {
        document.getElementById('create-password').classList.add('is-invalid');
        errorMessages.push('Mật khẩu phải có 6-8 ký tự');
        isValid = false;
    } else if (!/[A-Z]/.test(password)) {
        document.getElementById('create-password').classList.add('is-invalid');
        errorMessages.push('Mật khẩu phải chứa ít nhất một chữ cái in hoa');
        isValid = false;
    } else if (!/[a-z]/.test(password)) {
        document.getElementById('create-password').classList.add('is-invalid');
        errorMessages.push('Mật khẩu phải chứa ít nhất một chữ cái thường');
        isValid = false;
    } else if (!/[0-9]/.test(password)) {
        document.getElementById('create-password').classList.add('is-invalid');
        errorMessages.push('Mật khẩu phải chứa ít nhất một chữ số');
        isValid = false;
    }

    // Show errors if any
    if (!isValid) {
        alertElement.textContent = errorMessages.join(', ');
        alertElement.style.display = 'block';
        return;
    }

    // Create userData object
    const userData = {
        fullName: fullName,
        email: email,
        password: password
    };

    // Get CSRF token
    const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

    fetch('/AdminUser/Create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': token
        },
        body: JSON.stringify(userData)
    })
        .then(response => response.json().then(data => ({ status: response.status, body: data })))
        .then(({ status, body }) => {
            if (status >= 200 && status < 300) {
                // Success
                bootstrap.Modal.getInstance(document.getElementById('createUserModal')).hide();
                showToast('success', 'Tạo người dùng thành công');

                // Reload the page to show the new user
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                // Error
                alertElement.textContent = body.message || 'Có lỗi xảy ra';
                alertElement.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error creating user:', error);
            alertElement.textContent = 'Có lỗi xảy ra khi tạo người dùng';
            alertElement.style.display = 'block';
        });
}

// Update user row in the table
function updateUserRow(userData) {
    const userRow = document.querySelector(`tr[data-user-id="${userData.userId}"]`);
    if (userRow) {
        userRow.querySelector('.user-name').textContent = userData.fullName;
        userRow.querySelector('.user-email').textContent = userData.email;
    } else {
        // If we can't find the row, reload the page
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}

// Reset password with confirmation modal
function resetPassword(userId) {
    const userRow = document.querySelector(`tr[data-user-id="${userId}"]`);
    const userName = userRow ? userRow.querySelector('.user-name').textContent : 'người dùng này';

    showConfirmation({
        type: 'reset',
        title: '<i class="fas fa-key me-2"></i>Xác nhận đặt lại mật khẩu',
        message: `Bạn có chắc chắn muốn đặt lại mật khẩu cho người dùng <strong>"${userName}"</strong>? Mật khẩu mới sẽ được tạo tự động.`,
        buttonText: 'Đặt lại mật khẩu',
        buttonClass: 'btn-warning',
        onConfirm: function () {
            const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

            fetch(`/AdminUser/ResetPassword/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'RequestVerificationToken': token
                },
                body: `__RequestVerificationToken=${token}`
            })
                .then(response => response.json().then(data => ({ status: response.status, body: data })))
                .then(({ status, body }) => {
                    if (status >= 200 && status < 300) {
                        // Success - Show new password in a styled modal instead of a toast
                        showPasswordResult(body.newPassword);
                    } else {
                        // Error
                        throw new Error(body.message || 'Có lỗi xảy ra');
                    }
                })
                .catch(error => {
                    console.error('Error resetting password:', error);
                    showToast('error', 'Đặt lại mật khẩu thất bại: ' + (error.message || 'Có lỗi xảy ra'));
                });
        }
    });
}

// Show password result in a nice modal
function showPasswordResult(password) {
    // Create modal if it doesn't exist
    if (!document.getElementById('passwordResultModal')) {
        const modalHtml = `
            <div class="modal fade" id="passwordResultModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow">
                        <div class="modal-header bg-success text-white">
                            <h5 class="modal-title"><i class="fas fa-check-circle me-2"></i>Đặt lại mật khẩu thành công</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body p-4">
                            <div class="text-center mb-3">
                                <i class="fas fa-key fa-3x text-success opacity-75"></i>
                            </div>
                            <p class="text-center mb-3 fs-5">Mật khẩu mới đã được tạo thành công</p>
                            <div class="input-group mb-3">
                                <span class="input-group-text bg-light"><i class="fas fa-lock"></i></span>
                                <input type="text" class="form-control form-control-lg text-center fw-bold" id="newPasswordValue" readonly>
                                <button class="btn btn-outline-secondary" type="button" id="copyPasswordBtn" title="Sao chép mật khẩu">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <div class="alert alert-warning">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                Vui lòng lưu lại mật khẩu này hoặc thông báo cho người dùng ngay lập tức.
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Đã hiểu</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        // Add copy button functionality
        document.getElementById('copyPasswordBtn').addEventListener('click', function () {
            const passwordInput = document.getElementById('newPasswordValue');
            const copyButton = this;

            navigator.clipboard.writeText(passwordInput.value).then(() => {
                copyButton.innerHTML = '<i class="fas fa-check"></i>';
                copyButton.classList.remove('btn-outline-secondary');
                copyButton.classList.add('btn-success');

                setTimeout(() => {
                    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                    copyButton.classList.remove('btn-success');
                    copyButton.classList.add('btn-outline-secondary');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy password:', err);
                showToast('error', 'Không thể sao chép mật khẩu.');
            });
        });
    }

    // Set the password value
    document.getElementById('newPasswordValue').value = password;

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('passwordResultModal'));
    modal.show();
}

// Initialize modals and their event handlers
function initializeModals() {
    // Add the edit-alert div if it doesn't exist
    if (!document.getElementById('edit-alert')) {
        const alertDiv = document.createElement('div');
        alertDiv.id = 'edit-alert';
        alertDiv.className = 'alert alert-danger';
        alertDiv.style.display = 'none';

        const editForm = document.getElementById('editUserForm');
        if (editForm) {
            editForm.insertAdjacentElement('afterbegin', alertDiv);
        }
    }

    // Edit user form submission
    const editForm = document.getElementById('editUserForm');
    if (editForm) {
        editForm.addEventListener('submit', submitEditForm);
    }

    // Create user form submission
    const createForm = document.getElementById('createUserForm');
    if (createForm) {
        createForm.addEventListener('submit', submitCreateForm);
    }

    // Password change checkbox behavior
    const changePasswordCheck = document.getElementById('changePasswordCheck');
    if (changePasswordCheck) {
        changePasswordCheck.addEventListener('change', function () {
            const passwordSection = document.getElementById('passwordSection');
            if (this.checked) {
                passwordSection.style.display = 'block';
            } else {
                passwordSection.style.display = 'none';
                document.getElementById('edit-newPassword').value = '';
            }
        });
    }

    // Add new user button
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function () {
            // Reset the form before showing
            document.getElementById('createUserForm').reset();

            // Hide any previous alerts
            const alertElement = document.getElementById('create-alert');
            if (alertElement) {
                alertElement.style.display = 'none';
            }

            // Show the modal
            const createModal = new bootstrap.Modal(document.getElementById('createUserModal'));
            createModal.show();
        });
    }

    // Initialize action buttons
    initializeActionButtons();
}

// Show toast notifications at the top of the screen
function showToast(type, message) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1100'; // Higher z-index to appear above all elements
        container.style.marginTop = '60px'; // Add space below navbar
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast align-items-center ${type === 'error' ? 'bg-danger' : 'bg-success'} text-white border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    document.getElementById('toast-container').appendChild(toast);

    const bsToast = new bootstrap.Toast(toast, { autohide: true, delay: 5000 });
    bsToast.show();

    // Remove the toast from the DOM after it's hidden
    toast.addEventListener('hidden.bs.toast', function () {
        toast.remove();
    });
}

// Delete user function with enhanced confirmation modal
function deleteUser(userId) {
    const userRow = document.querySelector(`tr[data-user-id="${userId}"]`);
    const userName = userRow ? userRow.querySelector('.user-name').textContent : 'người dùng này';

    showConfirmation({
        type: 'delete',
        title: '<i class="fas fa-trash-alt me-2"></i>Xác nhận xóa người dùng',
        message: `Bạn có chắc chắn muốn xóa người dùng <strong>"${userName}"</strong>?<br><br>
                  <span class="text-muted"><i class="fas fa-info-circle me-1"></i> Người dùng sẽ không thể đăng nhập, nhưng các bài viết của họ sẽ được giữ lại.</span>`,
        buttonText: 'Xóa người dùng',
        buttonClass: 'btn-danger',
        onConfirm: function () {
            const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

            fetch(`/AdminUser/Delete/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'RequestVerificationToken': token
                },
                body: `__RequestVerificationToken=${token}`
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(data => Promise.reject(data));
                    }
                    return response.json();
                })
                .then(data => {
                    showToast('success', 'Người dùng đã được xóa thành công');

                    // Update UI - change row style or add deleted indicator
                    const userRow = document.querySelector(`tr[data-user-id="${userId}"]`);
                    if (userRow) {
                        userRow.classList.add('table-danger');

                        // Add "Đã xóa" badge
                        const statusColumn = userRow.querySelector('.user-status');
                        if (statusColumn) {
                            statusColumn.innerHTML = '<span class="badge bg-danger">Đã xóa</span>';
                        }

                        // Replace action buttons with restore button
                        const actionColumn = userRow.querySelector('.user-actions');
                        if (actionColumn) {
                            actionColumn.innerHTML = `
                            <button type="button" class="btn btn-sm btn-outline-success restore-user-btn" 
                                    data-user-id="${userId}">
                                <i class="fas fa-trash-restore"></i> Khôi phục
                            </button>
                        `;

                            // Re-attach event listener to the new button
                            const newRestoreBtn = actionColumn.querySelector('.restore-user-btn');
                            if (newRestoreBtn) {
                                newRestoreBtn.addEventListener('click', function () {
                                    restoreUser(userId);
                                });
                            }
                        }
                    } else {
                        // If we can't find the row, reload the page
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                })
                .catch(error => {
                    console.error('Error deleting user:', error);
                    showToast('error', 'Xóa thất bại: ' + (error.message || 'Có lỗi xảy ra'));
                });
        }
    });
}

// Initialize action buttons
function initializeActionButtons() {
    // Add event listeners for delete and restore buttons
    document.querySelectorAll('.delete-user-btn').forEach(button => {
        button.addEventListener('click', function () {
            const userId = this.getAttribute('data-user-id');
            deleteUser(userId);
        });
    });

    document.querySelectorAll('.restore-user-btn').forEach(button => {
        button.addEventListener('click', function () {
            const userId = this.getAttribute('data-user-id');
            restoreUser(userId);
        });
    });
}

// Restore user function with enhanced confirmation modal
function restoreUser(userId) {
    const userRow = document.querySelector(`tr[data-user-id="${userId}"]`);
    const userName = userRow ? userRow.querySelector('.user-name').textContent : 'người dùng này';

    showConfirmation({
        type: 'restore',
        title: '<i class="fas fa-trash-restore me-2"></i>Xác nhận khôi phục người dùng',
        message: `Bạn có chắc chắn muốn khôi phục người dùng <strong>"${userName}"</strong>?<br><br>
                  <span class="text-muted"><i class="fas fa-info-circle me-1"></i> Người dùng sẽ có thể đăng nhập và sử dụng ứng dụng bình thường.</span>`,
        buttonText: 'Khôi phục người dùng',
        buttonClass: 'btn-success',
        onConfirm: function () {
            const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

            fetch(`/AdminUser/Restore/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'RequestVerificationToken': token
                },
                body: `__RequestVerificationToken=${token}`
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(data => Promise.reject(data));
                    }
                    return response.json();
                })
                .then(data => {
                    showToast('success', 'Người dùng đã được khôi phục thành công');

                    // Update UI
                    const userRow = document.querySelector(`tr[data-user-id="${userId}"]`);
                    if (userRow) {
                        userRow.classList.remove('table-danger');

                        // Update status
                        const statusColumn = userRow.querySelector('.user-status');
                        if (statusColumn) {
                            statusColumn.innerHTML = '<span class="badge bg-info">Hoạt động</span>';
                        }

                        // Replace restore button with regular action buttons
                        const actionColumn = userRow.querySelector('.user-actions');
                        if (actionColumn) {
                            actionColumn.innerHTML = `
                            <div class="btn-group">
                                <button type="button" class="btn btn-sm btn-outline-primary edit-user-btn" data-user-id="${userId}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <a href="/AdminUser/Details/${userId}" class="btn btn-sm btn-outline-info">
                                    <i class="fas fa-info-circle"></i>
                                </a>
                                <a href="/AdminUser/UserActivity/${userId}" class="btn btn-sm btn-outline-secondary">
                                    <i class="fas fa-history"></i>
                                </a>
                                <button type="button" class="btn btn-sm btn-outline-danger delete-user-btn" data-user-id="${userId}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;

                            // Re-attach event listeners to the new buttons
                            const newEditBtn = actionColumn.querySelector('.edit-user-btn');
                            if (newEditBtn) {
                                newEditBtn.addEventListener('click', function () {
                                    fetchUserForEdit(userId);
                                });
                            }

                            const newDeleteBtn = actionColumn.querySelector('.delete-user-btn');
                            if (newDeleteBtn) {
                                newDeleteBtn.addEventListener('click', function () {
                                    deleteUser(userId);
                                });
                            }
                        }
                    } else {
                        // If we can't find the row, reload the page
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                })
                .catch(error => {
                    console.error('Error restoring user:', error);
                    showToast('error', 'Khôi phục thất bại: ' + (error.message || 'Có lỗi xảy ra'));
                });
        }
    });
}
