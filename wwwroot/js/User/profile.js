/**
 * Profile Management - User profile operations with AJAX and CropperJS integration
 * Version: 2.0
 * For WebBaoDienTu project
 */
document.addEventListener('DOMContentLoaded', function () {
    // =========================================================
    // Element References
    // =========================================================
    const viewProfileCard = document.getElementById('viewProfileCard');
    const editProfileCard = document.getElementById('editProfileCard');
    const profileForm = document.getElementById('profileForm');
    const bioTextarea = document.getElementById('bio');
    const bioCounter = document.getElementById('bioCounter');
    const avatarImage = document.getElementById('avatarImage');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    const avatarUpload = document.getElementById('avatarUpload');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');

    // Buttons
    const showEditBtn = document.getElementById('showEditBtn');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const confirmRemoveAvatar = document.getElementById('confirmRemoveAvatar');
    const cropAndUploadBtn = document.getElementById('cropAndUploadBtn');

    // Cropper UI controls
    const rotateLeftBtn = document.getElementById('rotateLeftBtn');
    const rotateRightBtn = document.getElementById('rotateRightBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetBtn = document.getElementById('resetBtn');

    // Modals
    const cropAvatarModal = document.getElementById('cropAvatarModal')
        ? new bootstrap.Modal(document.getElementById('cropAvatarModal'))
        : null;
    const removeAvatarModal = document.getElementById('removeAvatarModal')
        ? new bootstrap.Modal(document.getElementById('removeAvatarModal'))
        : null;

    // State
    let cropper = null;
    let originalFormData = {};

    // =========================================================
    // Initialize
    // =========================================================
    function init() {
        // Save original form data for reset
        if (profileForm) {
            const formFields = profileForm.querySelectorAll('input, select, textarea');
            formFields.forEach(field => {
                originalFormData[field.id] = field.value;
            });
        }

        // Initialize bio counter
        if (bioTextarea && bioCounter) {
            updateBioCounter();
        }

        // Set up event listeners
        setupEventListeners();
    }

    // =========================================================
    // Event Handlers
    // =========================================================
    function setupEventListeners() {
        // Bio counter
        if (bioTextarea) {
            bioTextarea.addEventListener('input', updateBioCounter);
        }

        // Edit profile buttons
        if (showEditBtn) {
            showEditBtn.addEventListener('click', showEditForm);
        }

        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', showEditForm);
        }

        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', cancelEdit);
        }

        // Form submission
        if (profileForm) {
            profileForm.addEventListener('submit', handleProfileSubmit);
        }

        // Avatar functionality
        if (changeAvatarBtn) {
            changeAvatarBtn.addEventListener('click', handleAvatarChange);
        }

        if (avatarUpload) {
            avatarUpload.addEventListener('change', handleFileSelection);
        }

        // Crop controls
        if (rotateLeftBtn) {
            rotateLeftBtn.addEventListener('click', () => {
                if (cropper) cropper.rotate(-90);
            });
        }

        if (rotateRightBtn) {
            rotateRightBtn.addEventListener('click', () => {
                if (cropper) cropper.rotate(90);
            });
        }

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                if (cropper) cropper.zoom(0.1);
            });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                if (cropper) cropper.zoom(-0.1);
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (cropper) cropper.reset();
            });
        }

        if (cropAndUploadBtn) {
            cropAndUploadBtn.addEventListener('click', cropAndUploadAvatar);
        }

        if (confirmRemoveAvatar) {
            confirmRemoveAvatar.addEventListener('click', removeAvatar);
        }
    }

    // =========================================================
    // Profile Management
    // =========================================================

    /**
     * Shows the profile edit form
     */
    function showEditForm() {
        if (viewProfileCard && editProfileCard) {
            viewProfileCard.style.display = 'none';
            editProfileCard.style.display = 'block';
        }
    }

    /**
     * Cancels profile editing and returns to view mode
     */
    function cancelEdit() {
        // Reset form to original values
        if (profileForm) {
            const formFields = profileForm.querySelectorAll('input, select, textarea');
            formFields.forEach(field => {
                if (originalFormData[field.id] !== undefined) {
                    field.value = originalFormData[field.id];
                }
            });

            // Reset validation
            clearValidationErrors();

            // Update bio counter
            updateBioCounter();
        }

        // Switch back to view mode
        if (viewProfileCard && editProfileCard) {
            viewProfileCard.style.display = 'block';
            editProfileCard.style.display = 'none';
        }
    }

    /**
     * Updates the bio character counter
     */
    function updateBioCounter() {
        if (bioTextarea && bioCounter) {
            const length = bioTextarea.value.length;
            bioCounter.textContent = length;

            // Optional: Change color when approaching limit
            if (length > 450) {
                bioCounter.style.color = '#dc3545';
            } else if (length > 400) {
                bioCounter.style.color = '#fd7e14';
            } else {
                bioCounter.style.color = '#6c757d';
            }
        }
    }

    /**
     * Clear all validation errors in the form
     */
    function clearValidationErrors() {
        const invalidFields = profileForm.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => field.classList.remove('is-invalid'));

        const feedbacks = profileForm.querySelectorAll('.invalid-feedback');
        feedbacks.forEach(feedback => {
            feedback.textContent = '';
        });
    }

    /**
     * Handle profile form submission
     * @param {Event} e - Form submit event
     */
    function handleProfileSubmit(e) {
        e.preventDefault();

        // Show loading indicator
        if (saveProfileBtn) {
            saveProfileBtn.disabled = true;
            saveProfileBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';
        }

        // Reset validation
        clearValidationErrors();

        // Get form data
        const formData = new FormData();
        formData.append('FullName', document.getElementById('fullName').value);
        formData.append('PhoneNumber', document.getElementById('phoneNumber').value || "");
        formData.append('Address', document.getElementById('address').value || "");
        formData.append('DateOfBirth', document.getElementById('dateOfBirth').value || "");
        formData.append('Gender', document.getElementById('gender').value || "");
        formData.append('Bio', document.getElementById('bio').value || "");

        // Get antiforgery token
        const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

        // Submit profile data
        fetch('/Profile/Update', {
            method: 'POST',
            headers: {
                'RequestVerificationToken': token
            },
            body: formData
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Update display values in view mode
                    updateProfileDisplay(data.profile);

                    // Update original form data
                    Object.keys(originalFormData).forEach(key => {
                        const field = document.getElementById(key);
                        if (field) {
                            originalFormData[key] = field.value;
                        }
                    });

                    // Switch back to view mode
                    viewProfileCard.style.display = 'block';
                    editProfileCard.style.display = 'none';

                    // Show success message
                    showAlert('Cập nhật hồ sơ thành công', 'success');
                } else {
                    // Handle validation errors
                    handleValidationErrors(data.errors);

                    showAlert(data.message || 'Có lỗi xảy ra khi cập nhật hồ sơ', 'danger');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('Có lỗi xảy ra khi cập nhật hồ sơ', 'danger');
            })
            .finally(() => {
                // Reset button state
                if (saveProfileBtn) {
                    saveProfileBtn.disabled = false;
                    saveProfileBtn.innerHTML = '<i class="fas fa-save me-1"></i> Lưu thay đổi';
                }
            });
    }

    /**
     * Update the profile display in view mode
     * @param {Object} profile - Updated profile data
     */
    function updateProfileDisplay(profile) {
        // Update display values
        document.getElementById('displayFullName').textContent = profile.fullName;

        document.getElementById('displayPhoneNumber').textContent =
            profile.phoneNumber || 'Chưa cập nhật';

        document.getElementById('displayAddress').textContent =
            profile.address || 'Chưa cập nhật';

        // Format date
        let dateOfBirth = 'Chưa cập nhật';
        if (profile.dateOfBirth) {
            const date = new Date(profile.dateOfBirth);
            dateOfBirth = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        }
        document.getElementById('displayDateOfBirth').textContent = dateOfBirth;

        // Map gender value to display text
        let genderText = 'Chưa cập nhật';
        if (profile.gender === 'male') genderText = 'Nam';
        else if (profile.gender === 'female') genderText = 'Nữ';
        else if (profile.gender === 'other') genderText = 'Khác';
        document.getElementById('displayGender').textContent = genderText;

        // Bio with fallback
        document.getElementById('displayBio').textContent = profile.bio || 'Chưa cập nhật';
    }

    /**
     * Handle validation errors returned from server
     * @param {Object} errors - Validation errors
     */
    function handleValidationErrors(errors) {
        if (!errors) return;

        Object.keys(errors).forEach(key => {
            const fieldName = key.charAt(0).toLowerCase() + key.slice(1);
            const input = document.getElementById(fieldName);
            const feedback = document.getElementById(`${fieldName}Feedback`);

            if (input && feedback) {
                input.classList.add('is-invalid');
                feedback.textContent = errors[key].join(' ');
            }
        });
    }

    // =========================================================
    // Avatar Management
    // =========================================================

    /**
     * Handle avatar change button click
     * Shows context menu with options for avatar management
     */
    function handleAvatarChange(event) {
        // Stop event propagation to prevent immediate document click
        event.stopPropagation();

        // Add a console log to verify the function is being called
        console.log('Avatar change button clicked');

        // Remove any existing context menu
        const existingMenu = document.getElementById('avatarContextMenu');
        if (existingMenu) {
            document.body.removeChild(existingMenu);
        }

        // If user has avatar, show menu with options
        if (profileData.hasAvatar) {
            const contextMenu = createAvatarContextMenu();
            document.body.appendChild(contextMenu);

            positionContextMenu(contextMenu, this);

            // Add event listeners for menu options
            document.getElementById('uploadNewAvatar').addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Triggering file input click');
                avatarUpload.click();
                document.body.removeChild(contextMenu);
            });

            document.getElementById('removeAvatarOption').addEventListener('click', (e) => {
                e.preventDefault();
                removeAvatarModal.show();
                document.body.removeChild(contextMenu);
            });

            // Close menu when clicking outside
            setTimeout(() => {
                document.addEventListener('click', function closeMenu(e) {
                    if (!contextMenu.contains(e.target) && e.target !== changeAvatarBtn) {
                        if (document.body.contains(contextMenu)) {
                            document.body.removeChild(contextMenu);
                        }
                        document.removeEventListener('click', closeMenu);
                    }
                });
            }, 10);
        } else {
            // No avatar yet, directly open file picker
            console.log('Directly triggering file input click');
            avatarUpload.click();
        }
    }


    /**
     * Creates the avatar context menu element
     * @returns {HTMLElement} The context menu
     */
    function createAvatarContextMenu() {
        const menu = document.createElement('div');
        menu.className = 'dropdown-menu show position-absolute';
        menu.id = 'avatarContextMenu';
        menu.style.zIndex = '1050';

        menu.innerHTML = `
        <a class="dropdown-item" href="#" id="uploadNewAvatar">
            <i class="fas fa-upload me-2"></i> Tải lên ảnh mới
        </a>
        <a class="dropdown-item text-danger" href="#" id="removeAvatarOption">
            <i class="fas fa-trash-alt me-2"></i> Xóa ảnh đại diện
        </a>
    `;

        return menu;
    }

    /**
     * Position the context menu near the button
     * @param {HTMLElement} menu - The context menu
     * @param {HTMLElement} button - The button that triggered the menu
     */
    function positionContextMenu(menu, button) {
        const rect = button.getBoundingClientRect();

        // Position below the button with some offset
        menu.style.top = `${window.scrollY + rect.bottom + 5}px`;
        menu.style.left = `${window.scrollX + rect.left - 10}px`;

        // Make sure the menu stays within the viewport
        setTimeout(() => {
            const menuRect = menu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;

            if (menuRect.right > viewportWidth) {
                menu.style.left = `${window.scrollX + rect.right - menuRect.width}px`;
            }
        }, 0);
    }
    /**
     * Handle file selection for avatar upload
     */
    function handleFileSelection() {
        if (this.files && this.files[0]) {
            const file = this.files[0];

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showAlert('Kích thước ảnh không được vượt quá 5MB', 'danger');
                this.value = '';
                return;
            }

            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                showAlert('Chỉ chấp nhận file ảnh .jpg, .png, .gif', 'danger');
                this.value = '';
                return;
            }

            // Read and display the image
            const reader = new FileReader();
            reader.onload = function (e) {
                // Set up cropper
                const cropperImage = document.getElementById('cropperImage');
                if (cropperImage) {
                    cropperImage.src = e.target.result;
                }

                if (cropAvatarModal) {
                    cropAvatarModal.show();

                    // Initialize cropper after modal is shown
                    document.getElementById('cropAvatarModal').addEventListener('shown.bs.modal', function () {
                        initCropper();
                    }, { once: true });
                }
            };

            reader.readAsDataURL(file);
        }
    }

    /**
     * Initialize the cropper
     */
    function initCropper() {
        const cropperImage = document.getElementById('cropperImage');

        if (cropper) {
            cropper.destroy();
        }

        if (cropperImage) {
            cropper = new Cropper(cropperImage, {
                aspectRatio: 1, // Square aspect ratio for profile picture
                viewMode: 1,    // Restrict the crop box to not exceed the size of the canvas
                autoCropArea: 0.8, // 80% of the image will be in the crop box
                dragMode: 'move', // Allow moving the image
                guides: true,     // Show grid lines
                center: true,     // Show center indicator
                highlight: false, // Don't highlight the crop area
                background: false,// Don't show the grid background
                cropBoxMovable: true,   // Allow moving the crop box
                cropBoxResizable: true, // Allow resizing the crop box
                toggleDragModeOnDblclick: false, // Don't toggle drag mode on double click
                responsive: true,  // Re-render on window resize
                restore: false,    // Don't restore after resize
                checkOrientation: false, // Don't check the orientation
                checkCrossOrigin: false,  // Don't check if the image is cross-origin
                zoomable: true,
                zoomOnWheel: true,
                scalable: true,
                minContainerWidth: 250,
                minContainerHeight: 250,
                minCropBoxWidth: 100,
                minCropBoxHeight: 100
            });
        }
    }

    /**
     * Crop and upload the avatar
     */
    function cropAndUploadAvatar() {
        if (!cropper) return;

        // Show loading indicator
        this.disabled = true;
        this.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Đang xử lý...';

        // Get cropped canvas
        const canvas = cropper.getCroppedCanvas({
            width: 300,
            height: 300,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        if (!canvas) {
            showAlert('Không thể tạo ảnh từ vùng đã cắt', 'danger');
            resetCropButton();
            return;
        }

        // Convert to blob
        canvas.toBlob(blob => {
            if (!blob) {
                showAlert('Không thể xử lý ảnh', 'danger');
                resetCropButton();
                return;
            }

            const formData = new FormData();
            formData.append('Avatar', blob, 'avatar.jpg');

            const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

            // Upload to server
            fetch('/Profile/UpdateAvatar', {
                method: 'POST',
                headers: {
                    'RequestVerificationToken': token
                },
                body: formData
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        // Update avatar in UI
                        updateAvatarUI(data.avatarUrl);

                        // Update profile data
                        profileData.hasAvatar = true;
                        profileData.avatarUrl = data.avatarUrl;

                        // Close modal and show success
                        cropAvatarModal.hide();
                        showAlert('Cập nhật ảnh đại diện thành công', 'success');
                    } else {
                        showAlert(data.message || 'Có lỗi xảy ra khi cập nhật ảnh đại diện', 'danger');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showAlert('Có lỗi xảy ra khi cập nhật ảnh đại diện', 'danger');
                })
                .finally(() => {
                    resetCropButton();
                    avatarUpload.value = ''; // Reset file input
                });
        }, 'image/jpeg', 0.9);
    }

    /**
     * Reset the crop button state
     */
    function resetCropButton() {
        const button = document.getElementById('cropAndUploadBtn');
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-crop me-1"></i> Cắt và lưu';
        }
    }

    /**
     * Update the avatar UI with new image
     * @param {string} avatarUrl - URL to the new avatar
     */
    function updateAvatarUI(avatarUrl) {
        if (avatarPlaceholder) {
            // Replace placeholder with image
            const newAvatar = document.createElement('img');
            newAvatar.id = 'avatarImage';
            newAvatar.className = 'rounded-circle avatar-img';
            newAvatar.alt = 'Avatar';
            newAvatar.src = avatarUrl;

            const avatarContainer = document.querySelector('.avatar-container');
            if (avatarContainer) {
                avatarContainer.replaceChild(newAvatar, avatarPlaceholder);

                // Make sure the overlay is still present
                const overlay = avatarContainer.querySelector('.avatar-overlay');
                if (overlay) {
                    avatarContainer.appendChild(overlay);
                }
            }
        } else if (avatarImage) {
            // Update existing avatar
            avatarImage.src = avatarUrl;
        }
    }

    /**
     * Remove the user's avatar
     */
    function removeAvatar() {
        // Show loading indicator
        this.disabled = true;
        this.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Đang xóa...';

        const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

        fetch('/Profile/RemoveAvatar', {
            method: 'POST',
            headers: {
                'RequestVerificationToken': token,
                'Content-Type': 'application/json'
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
                    // Replace image with placeholder
                    replaceAvatarWithPlaceholder();

                    // Update profile data
                    profileData.hasAvatar = false;
                    profileData.avatarUrl = null;

                    // Close the modal
                    if (removeAvatarModal) {
                        removeAvatarModal.hide();
                    }

                    // Reload page to refresh the layout avatar
                    showAlert('Đã xóa ảnh đại diện', 'success');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showAlert(data.message || 'Có lỗi xảy ra khi xóa ảnh đại diện', 'danger');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('Có lỗi xảy ra khi xóa ảnh đại diện', 'danger');
            })
            .finally(() => {
                // Reset button state
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-trash-alt me-1"></i> Xóa';
            });
    }


    /**
     * Replace avatar image with placeholder
     */
    function replaceAvatarWithPlaceholder() {
        if (!avatarImage) return;

        const placeholder = document.createElement('div');
        placeholder.id = 'avatarPlaceholder';
        placeholder.className = 'avatar-placeholder rounded-circle';

        // Get first letter of name for placeholder
        const fullName = document.getElementById('fullName')?.value ||
            document.getElementById('displayFullName')?.textContent ||
            profileData.fullName ||
            'U';
        placeholder.innerText = fullName.substring(0, 1).toUpperCase();

        const avatarContainer = document.querySelector('.avatar-container');
        if (avatarContainer) {
            avatarContainer.replaceChild(placeholder, avatarImage);

            // Make sure the overlay is still present
            const overlay = avatarContainer.querySelector('.avatar-overlay');
            if (overlay) {
                avatarContainer.appendChild(overlay);
            }
        }
    }

    // Direct alternative method to trigger file input
    changeAvatarBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Avatar button clicked - direct approach');
        document.getElementById('avatarUpload').click();
    });


    // =========================================================
    // Utility Functions
    // =========================================================

    /**
     * Show alert message
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success, danger, warning, info)
     */
    function showAlert(message, type) {
        const alertEl = document.getElementById('profileAlert');
        const alertMessage = document.getElementById('alertMessage');

        if (alertEl && alertMessage) {
            alertEl.className = `alert alert-${type} alert-dismissible fade show`;
            alertMessage.textContent = message;
            alertEl.style.display = 'block';

            // Auto dismiss after 5 seconds
            setTimeout(() => {
                alertEl.classList.remove('show');
                setTimeout(() => {
                    alertEl.style.display = 'none';
                }, 150);
            }, 5000);
        }
    }

    // =========================================================
    // Initialize the profile page
    // =========================================================
    init();
});
