// wwwroot/js/Layout/modules/auth.js

export default class AuthManager {
    constructor() {
        this.loginAttempts = {};
        this.verificationEmail = "";
        this.resendCooldown = false;
        this.countdownInterval = null;
    }

    // Load login attempts from session storage
    loadLoginAttempts() {
        try {
            const saved = sessionStorage.getItem('loginAttempts');
            if (saved) {
                this.loginAttempts = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Error loading login attempts from sessionStorage', e);
            this.loginAttempts = {};
        }
    }

    // Save login attempts to session storage
    saveLoginAttempts() {
        try {
            sessionStorage.setItem('loginAttempts', JSON.stringify(this.loginAttempts));
        } catch (e) {
            console.error('Error saving login attempts to sessionStorage', e);
        }
    }

    // Handle user login
    handleLogin(email, password, rememberMe, submitBtn) {
        $("#loginErrorMessage").hide();

        // Check for account lockout
        const lockData = this.checkAccountLocked(email);
        if (lockData.isLocked) {
            this.showAccountLockedMessage(lockData.remainingTime);
            return;
        }

        this.setButtonLoading(submitBtn, true);

        const formData = new FormData();
        formData.append('Email', email);
        formData.append('Password', password);
        formData.append('RememberMe', rememberMe);

        $.ajax({
            type: "POST",
            url: "/api/Auth/login",
            data: formData,
            processData: false,
            contentType: false,
            cache: false,
            success: (response) => {
                if (response.success) {
                    this.resetLoginAttempts(email);
                    window.location.reload();
                } else {
                    this.handleFailedLogin(email);
                    $("#loginErrorMessage").text(response.message).show();
                    this.setButtonLoading(submitBtn, false);
                }
            },
            error: (xhr) => {
                let errorMsg = "Có lỗi xảy ra. Vui lòng thử lại sau.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                }

                if (xhr.responseJSON && xhr.responseJSON.isLocked) {
                    this.handleAccountLocked(email, xhr.responseJSON.remainingMinutes);
                } else {
                    this.handleFailedLogin(email);
                }

                $("#loginErrorMessage").text(errorMsg).show();
                this.setButtonLoading(submitBtn, false);
            }
        });
    }

    // Handle user registration
    handleRegistration(fullName, email, password, confirmPassword, submitBtn) {
        $("#registerErrorMessage").hide();
        this.setButtonLoading(submitBtn, true);

        // Validate password
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,8}$/;
        if (!passwordRegex.test(password)) {
            $("#registerErrorMessage").text("Mật khẩu phải từ 6-8 ký tự, chứa ít nhất một chữ cái in hoa và một số.").show();
            this.setButtonLoading(submitBtn, false);
            return;
        }

        // Validate password match
        if (password !== confirmPassword) {
            $("#registerErrorMessage").text("Mật khẩu xác nhận không khớp.").show();
            this.setButtonLoading(submitBtn, false);
            return;
        }

        const formData = new FormData();
        formData.append('FullName', fullName);
        formData.append('Email', email);
        formData.append('Password', password);
        formData.append('ConfirmPassword', confirmPassword);

        $.ajax({
            type: "POST",
            url: "/api/Auth/register",
            data: formData,
            processData: false,
            contentType: false,
            cache: false,
            success: (response) => {
                if (response.success) {
                    if (response.requiresVerification) {
                        this.showVerificationModal(response.email);
                        $("#registerForm")[0].reset();
                    } else {
                        this.showSuccessMessage(response.message);
                        $("#registerForm")[0].reset();
                    }
                } else {
                    $("#registerErrorMessage").text(response.message).show();
                    this.setButtonLoading(submitBtn, false);
                }
            },
            error: (xhr) => {
                const errorMsg = xhr.responseJSON?.message || "Có lỗi xảy ra. Vui lòng thử lại sau.";
                $("#registerErrorMessage").text(errorMsg).show();
                this.setButtonLoading(submitBtn, false);
            }
        });
    }

    // Handle email verification
    handleEmailVerification(code, submitBtn) {
        if (!code || code.length !== 6) {
            $("#verificationErrorMessage").text("Vui lòng nhập mã xác nhận gồm 6 chữ số").show();
            return;
        }

        this.setButtonLoading(submitBtn, true);

        const formData = new FormData();
        formData.append('Email', this.verificationEmail);
        formData.append('Code', code);

        $.ajax({
            type: "POST",
            url: "/api/Auth/verify-email",
            data: formData,
            processData: false,
            contentType: false,
            cache: false,
            success: (response) => {
                if (response.success) {
                    $('#verificationModal').modal('hide');
                    this.showSuccessMessage(response.message);

                    // Redirect after success
                    setTimeout(() => {
                        $('#successModal').modal('hide');
                        if (response.redirectToLogin) {
                            $('#loginModal').modal('show');
                        } else {
                            window.location.reload();
                        }
                    }, 2000);
                } else {
                    $("#verificationErrorMessage").text(response.message).show();
                    this.setButtonLoading(submitBtn, false);
                }
            },
            error: (xhr) => {
                const errorMsg = xhr.responseJSON?.message || "Có lỗi xảy ra. Vui lòng thử lại sau.";
                $("#verificationErrorMessage").text(errorMsg).show();
                this.setButtonLoading(submitBtn, false);
            }
        });
    }

    // Resend verification code
    resendVerificationCode(btn) {
        if (this.resendCooldown) return;

        this.setButtonLoading(btn, true);

        const formData = new FormData();
        formData.append('Email', this.verificationEmail);

        $.ajax({
            type: "POST",
            url: "/api/Auth/resend-verification",
            data: formData,
            processData: false,
            contentType: false,
            cache: false,
            success: (response) => {
                if (response.success) {
                    $("#verificationErrorMessage").removeClass("alert-danger")
                        .addClass("alert-success")
                        .text(response.message)
                        .show();
                    this.startResendCooldown();
                } else {
                    $("#verificationErrorMessage").removeClass("alert-success")
                        .addClass("alert-danger")
                        .text(response.message)
                        .show();
                }
                this.setButtonLoading(btn, false);
            },
            error: (xhr) => {
                const errorMsg = xhr.responseJSON?.message || "Có lỗi xảy ra. Vui lòng thử lại sau.";
                $("#verificationErrorMessage").removeClass("alert-success")
                    .addClass("alert-danger")
                    .text(errorMsg)
                    .show();
                this.setButtonLoading(btn, false);
            }
        });
    }

    // Handle password change
    handlePasswordChange(currentPassword, newPassword, confirmPassword, submitBtn) {
        $("#passwordErrorMessage").hide();
        $('#changePasswordModalLabel i').addClass('icon-spin');
        this.setButtonLoading(submitBtn, true);

        // Validate password format
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,8}$/;
        if (!passwordRegex.test(newPassword)) {
            $("#passwordErrorMessage").text("Mật khẩu phải từ 6-8 ký tự, chứa ít nhất một chữ cái in hoa và một số.").show();
            $('#changePasswordModalLabel i').removeClass('icon-spin');
            this.setButtonLoading(submitBtn, false);
            return;
        }

        // Check password match
        if (newPassword !== confirmPassword) {
            $("#passwordErrorMessage").text("Xác nhận mật khẩu không khớp.").show();
            $('#changePasswordModalLabel i').removeClass('icon-spin');
            this.setButtonLoading(submitBtn, false);
            return;
        }

        const formData = new FormData();
        formData.append('CurrentPassword', currentPassword);
        formData.append('NewPassword', newPassword);
        formData.append('ConfirmPassword', confirmPassword);

        $.ajax({
            type: "POST",
            url: "/api/Auth/changePassword",
            data: formData,
            processData: false,
            contentType: false,
            cache: false,
            headers: {
                "RequestVerificationToken": $('input[name="__RequestVerificationToken"]').val()
            },
            success: (response) => {
                $('#changePasswordModalLabel i').removeClass('icon-spin');
                if (response.success) {
                    $("#changePasswordForm")[0].reset();
                    $('#changePasswordModal').modal('hide');
                    this.showSuccessMessage(response.message);
                } else {
                    $("#passwordErrorMessage").text(response.message).show();
                    this.setButtonLoading(submitBtn, false);
                }
            },
            error: (xhr) => {
                $('#changePasswordModalLabel i').removeClass('icon-spin');
                const errorMsg = xhr.responseJSON?.message || "Có lỗi xảy ra. Vui lòng thử lại sau.";
                $("#passwordErrorMessage").text(errorMsg).show();
                this.setButtonLoading(submitBtn, false);
            }
        });
    }

    // User logout
    logout() {
        $.ajax({
            type: "POST",
            url: "/api/Auth/logout",
            headers: {
                "RequestVerificationToken": $('input[name="__RequestVerificationToken"]').val()
            },
            success: (response) => {
                if (response.success) {
                    window.location.href = "/";
                } else {
                    this.showAlert("Đăng xuất thất bại", response.message || "Lỗi không xác định");
                }
            },
            error: (xhr) => {
                this.showAlert("Lỗi đăng xuất", xhr.responseJSON?.message || xhr.statusText);
            }
        });
    }

    // Show verification modal
    showVerificationModal(email) {
        this.verificationEmail = email;
        $('#verificationEmail').val(email);
        $('#verificationCode').val('');
        $('#verificationErrorMessage').hide();
        $('#registerModal').modal('hide');
        $('#loginModal').modal('hide');
        $('#verificationModal').modal('show');
    }

    // Show success message
    showSuccessMessage(message) {
        $('#successMessage').text(message);
        $('#successModal').modal('show');
    }

    // Show alert using SweetAlert
    showAlert(title, message, type = "error") {
        Swal.fire({
            title: title,
            html: message,
            icon: type,
            confirmButtonText: 'Đóng'
        });
    }

    // Set button loading state
    setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.data('original-html', button.html());
            button.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...');
            button.prop('disabled', true);
        } else {
            button.html(button.data('original-html'));
            button.prop('disabled', false);
        }
    }

    // Start cooldown for resend verification
    startResendCooldown() {
        this.resendCooldown = true;

        // Show countdown
        let seconds = 60;
        $("#countdownTimer").text(seconds);
        $("#resendCounter").show();
        $("#resendVerificationBtn").prop('disabled', true);

        // Clear any existing interval
        if (this.countdownInterval) clearInterval(this.countdownInterval);

        // Start countdown
        this.countdownInterval = setInterval(() => {
            seconds--;
            $("#countdownTimer").text(seconds);

            if (seconds <= 0) {
                clearInterval(this.countdownInterval);
                this.resendCooldown = false;
                $("#resendCounter").hide();
                $("#resendVerificationBtn").prop('disabled', false);
            }
        }, 1000);
    }

    // Format time as minutes:seconds
    formatTimeRemaining(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    // Handle failed login attempt
    handleFailedLogin(email) {
        if (!email) return;

        const key = email.toLowerCase();
        if (!this.loginAttempts[key]) {
            this.loginAttempts[key] = {
                count: 0,
                timestamp: new Date().getTime()
            };
        }

        // Increase attempt count
        this.loginAttempts[key].count++;
        this.loginAttempts[key].timestamp = new Date().getTime();

        // Store in sessionStorage
        this.saveLoginAttempts();

        // Check if account should be locked
        if (this.loginAttempts[key].count >= 5) {
            // Lock for 15 minutes
            const lockUntil = new Date().getTime() + (15 * 60 * 1000);
            this.loginAttempts[key].lockUntil = lockUntil;
            this.saveLoginAttempts();

            this.showAccountLockedMessage(15 * 60);
        } else {
            // Show warning about remaining attempts
            const remainingAttempts = 5 - this.loginAttempts[key].count;
            $("#loginErrorMessage").html(`
                <div class="alert alert-warning mb-0">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Đăng nhập không thành công. Bạn còn ${remainingAttempts} lần thử trước khi tài khoản bị tạm khóa.
                </div>
            `);
        }
    }

    // Handle server-side account lockout
    handleAccountLocked(email, remainingMinutes) {
        if (!email) return;

        const key = email.toLowerCase();
        const lockUntil = new Date().getTime() + (remainingMinutes * 60 * 1000);

        this.loginAttempts[key] = {
            count: 5,
            timestamp: new Date().getTime(),
            lockUntil: lockUntil
        };

        this.saveLoginAttempts();
        this.showAccountLockedMessage(remainingMinutes * 60);
    }

    // Show account locked message
    showAccountLockedMessage(remainingSeconds) {
        $("#loginErrorMessage").html(`
            <div class="alert alert-danger mb-0">
                <div class="d-flex align-items-center">
                    <i class="fas fa-lock fa-2x me-3 text-danger"></i>
                    <div>
                        <strong>Tài khoản tạm thời bị khóa</strong><br>
                        Bạn đã đăng nhập sai quá 5 lần. Vui lòng thử lại sau 
                        <span id="lockCountdown">${this.formatTimeRemaining(remainingSeconds)}</span>
                    </div>
                </div>
            </div>
        `);

        // Disable login button
        $("#loginForm").find('button[type="submit"]').html('<i class="fas fa-lock me-2"></i> Tài khoản bị khóa');
        $("#loginForm").find('button[type="submit"]').prop('disabled', true);

        // Start countdown timer
        this.startLockCountdown(remainingSeconds);
    }

    // Start countdown for locked account
    startLockCountdown(seconds) {
        let remainingTime = seconds;
        const countdownId = setInterval(() => {
            remainingTime--;

            if (remainingTime <= 0) {
                clearInterval(countdownId);
                $("#loginErrorMessage").html(`
                    <div class="alert alert-success mb-0">
                        Thời gian khóa đã hết. Bạn có thể thử đăng nhập lại.
                    </div>
                `);
                $("#loginForm").find('button[type="submit"]').html('<i class="fas fa-arrow-right me-2"></i> Đăng nhập');
                $("#loginForm").find('button[type="submit"]').prop('disabled', false);
                return;
            }

            $("#lockCountdown").text(this.formatTimeRemaining(remainingTime));
        }, 1000);

        // Store interval ID to clear when modal closes
        $("#loginModal").data("countdownId", countdownId);
    }

    // Check if account is locked
    checkAccountLocked(email) {
        if (!email) {
            return { isLocked: false };
        }

        this.loadLoginAttempts();
        const key = email.toLowerCase();
        const now = new Date().getTime();

        // Check if account is locked
        if (this.loginAttempts[key] &&
            this.loginAttempts[key].lockUntil &&
            this.loginAttempts[key].lockUntil > now) {
            const remainingMs = this.loginAttempts[key].lockUntil - now;
            const remainingSeconds = Math.ceil(remainingMs / 1000);
            return {
                isLocked: true,
                remainingTime: remainingSeconds
            };
        }

        // Check if attempts have expired (after 30 minutes)
        if (this.loginAttempts[key] &&
            (now - this.loginAttempts[key].timestamp > 30 * 60 * 1000)) {
            delete this.loginAttempts[key];
            this.saveLoginAttempts();
        }

        return { isLocked: false };
    }

    // Reset login attempts
    resetLoginAttempts(email) {
        if (!email) return;

        const key = email.toLowerCase();
        delete this.loginAttempts[key];
        this.saveLoginAttempts();
    }
}
