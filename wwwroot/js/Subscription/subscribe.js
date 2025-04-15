// subscribe.js - Handles subscription form functionality for site visitors

document.addEventListener('DOMContentLoaded', function () {
    // Footer subscription form submit
    const footerSubscriptionForm = document.getElementById('footerSubscriptionForm');
    if (footerSubscriptionForm) {
        footerSubscriptionForm.addEventListener('submit', function (e) {
            e.preventDefault();
            processSubscription(this);
        });
    }

    // Footer unsubscribe form submit
    const footerUnsubscribeForm = document.getElementById('footerUnsubscribeForm');
    if (footerUnsubscribeForm) {
        footerUnsubscribeForm.addEventListener('submit', function (e) {
            e.preventDefault();
            processUnsubscription(this);
        });
    }

    // Toggle between subscribe and unsubscribe forms
    const toggleSubscriptionMode = document.getElementById('toggleSubscriptionMode');
    if (toggleSubscriptionMode) {
        toggleSubscriptionMode.addEventListener('click', function (e) {
            e.preventDefault();
            toggleSubscriptionForms();
        });
    }

    // Handle subscribe form on dedicated subscription page if exists
    const pageSubscriptionForm = document.getElementById('pageSubscriptionForm');
    if (pageSubscriptionForm) {
        pageSubscriptionForm.addEventListener('submit', function (e) {
            e.preventDefault();
            processSubscription(this);
        });
    }

    // Handle unsubscribe form on dedicated unsubscribe page if exists
    const pageUnsubscribeForm = document.getElementById('pageUnsubscribeForm');
    if (pageUnsubscribeForm) {
        pageUnsubscribeForm.addEventListener('submit', function (e) {
            e.preventDefault();
            processUnsubscription(this);
        });
    }

    // Set the initial state of forms and toggle text
    initializeFormsState();
});

// Initialize the state of forms and toggle text
function initializeFormsState() {
    const subscribeForm = document.getElementById('footerSubscriptionForm');
    const unsubscribeForm = document.getElementById('footerUnsubscribeForm');
    const toggleText = document.getElementById('subscriptionToggleText');

    // Check if elements exist to avoid errors
    if (subscribeForm && unsubscribeForm && toggleText) {
        // Force explicit display styles to ensure predictable behavior
        // By default, set subscribe form visible and unsubscribe hidden
        subscribeForm.style.display = 'block';
        unsubscribeForm.style.display = 'none';
        toggleText.innerHTML = '<i class="fas fa-times-circle me-1"></i>Hủy đăng ký';
    }
}

// Process subscription form submission
function processSubscription(form) {
    // Get the email input
    const emailInput = form.querySelector('input[name="email"]');
    if (!emailInput) return;

    const email = emailInput.value.trim();
    if (!email) {
        showSubscriptionMessage('Vui lòng nhập email của bạn', 'error');
        return;
    }

    // Basic email validation
    if (!validateEmail(email)) {
        showSubscriptionMessage('Địa chỉ email không hợp lệ', 'error');
        return;
    }

    // Visual feedback - disable button and show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    // Get CSRF token
    const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

    // First verify if email exists
    verifyEmailExists(email, token)
        .then(isValid => {
            if (!isValid) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHTML;
                showSubscriptionMessage('Email này không tồn tại. Vui lòng nhập một địa chỉ email hợp lệ.', 'error');
                return;
            }

            // If email is valid, proceed with subscription
            // Call the API to subscribe
            fetch('/Subscription/Subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'RequestVerificationToken': token
                },
                body: `email=${encodeURIComponent(email)}&__RequestVerificationToken=${encodeURIComponent(token)}`
            })
                .then(response => response.json())
                .then(data => {
                    // Reset button state
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHTML;

                    if (data.success) {
                        // Show success message
                        showSubscriptionMessage(data.message, 'success');
                        emailInput.value = ''; // Clear the input on success

                        // If we're on the subscription page, show more prominent success message
                        if (form.id === 'pageSubscriptionForm') {
                            showPageSuccessMessage(data.message);
                        }
                    } else {
                        // Show error message
                        showSubscriptionMessage(data.message, 'error');
                    }
                })
                .catch(error => {
                    // Reset button state
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHTML;

                    console.error('Error:', error);
                    showSubscriptionMessage('Có lỗi xảy ra khi đăng ký. Vui lòng thử lại sau.', 'error');
                });
        })
        .catch(error => {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHTML;

            console.error('Email verification error:', error);
            showSubscriptionMessage('Có lỗi xảy ra khi kiểm tra email. Vui lòng thử lại sau.', 'error');
        });
}

// Improved verifyEmailExists function with better error handling
function verifyEmailExists(email, token) {
    return fetch('/api/Auth/VerifyEmailExists', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'RequestVerificationToken': token
        },
        body: `email=${encodeURIComponent(email)}&__RequestVerificationToken=${encodeURIComponent(token)}`
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Server error: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            return data.exists;
        })
        .catch(error => {
            console.error("Email verification failed:", error);
            // Default to true to allow form submission on verification failure
            return true;
        });
}

// Process unsubscription form submission
function processUnsubscription(form) {
    // Get the email input
    const emailInput = form.querySelector('input[name="email"]');
    if (!emailInput) return;

    const email = emailInput.value.trim();
    if (!email) {
        showSubscriptionMessage('Vui lòng nhập email của bạn', 'error');
        return;
    }

    // Basic email validation
    if (!validateEmail(email)) {
        showSubscriptionMessage('Địa chỉ email không hợp lệ', 'error');
        return;
    }

    // Visual feedback - disable button and show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    // Get CSRF token
    const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

    // Call the API to unsubscribe
    fetch('/Subscription/UnsubscribeConfirm', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'RequestVerificationToken': token
        },
        body: `email=${encodeURIComponent(email)}&__RequestVerificationToken=${encodeURIComponent(token)}`
    })
        .then(response => response.json())
        .then(data => {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHTML;

            if (data.success) {
                // Show success message
                showSubscriptionMessage(data.message, 'success');
                emailInput.value = ''; // Clear the input on success

                // If we're on the unsubscribe page, show more prominent success message
                if (form.id === 'pageUnsubscribeForm') {
                    showPageSuccessMessage(data.message);
                }
            } else {
                // Show error message
                showSubscriptionMessage(data.message, 'error');
            }
        })
        .catch(error => {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHTML;

            console.error('Error:', error);
            showSubscriptionMessage('Có lỗi xảy ra khi hủy đăng ký. Vui lòng thử lại sau.', 'error');
        });
}

function toggleSubscriptionForms() {
    const subscribeForm = document.getElementById('footerSubscriptionForm');
    const unsubscribeForm = document.getElementById('footerUnsubscribeForm');
    const toggleText = document.getElementById('subscriptionToggleText');

    // Kiểm tra các phần tử có tồn tại không
    console.log("Subscribe form exists:", subscribeForm !== null);
    console.log("Unsubscribe form exists:", unsubscribeForm !== null);
    console.log("Toggle text exists:", toggleText !== null);

    if (!subscribeForm || !unsubscribeForm || !toggleText) {
        console.error("One or more required elements not found");
        return;
    }

    // Kiểm tra trạng thái hiển thị hiện tại
    const computedStyleSubscribe = window.getComputedStyle(subscribeForm);
    const computedStyleUnsubscribe = window.getComputedStyle(unsubscribeForm);

    console.log("Subscribe form display:", computedStyleSubscribe.display);
    console.log("Unsubscribe form display:", computedStyleUnsubscribe.display);

    const subscribeFormIsVisible = computedStyleSubscribe.display !== 'none';
    console.log("Subscribe form is visible:", subscribeFormIsVisible);

    // Kiểm tra nội dung toggle text hiện tại
    console.log("Current toggle text:", toggleText.innerHTML);

    // Lấy giá trị email hiện tại
    const subscribeEmail = document.getElementById('footerEmail');
    const unsubscribeEmail = document.getElementById('footerUnsubEmail');
    let currentEmail = '';

    if (subscribeFormIsVisible && subscribeEmail) {
        currentEmail = subscribeEmail.value.trim();
    } else if (!subscribeFormIsVisible && unsubscribeEmail) {
        currentEmail = unsubscribeEmail.value.trim();
    }

    // Chuyển đổi hiển thị với giá trị rõ ràng
    if (subscribeFormIsVisible) {
        // Chuyển từ đăng ký sang hủy đăng ký
        subscribeForm.style.display = 'none';
        unsubscribeForm.style.display = 'block';
        toggleText.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Đăng ký nhận tin';
    } else {
        // Chuyển từ hủy đăng ký sang đăng ký
        subscribeForm.style.display = 'block';
        unsubscribeForm.style.display = 'none';
        toggleText.innerHTML = '<i class="fas fa-times-circle me-1"></i>Hủy đăng ký';
    }

    // Chuyển giá trị email nếu có
    if (currentEmail) {
        if (subscribeFormIsVisible) { // Đang hiển thị đăng ký, chuyển sang hủy
            if (unsubscribeEmail) {
                unsubscribeEmail.value = currentEmail;
            }
        } else { // Đang hiển thị hủy, chuyển sang đăng ký
            if (subscribeEmail) {
                subscribeEmail.value = currentEmail;
            }
        }
    }

    // Xóa thông báo cũ nếu có
    const resultElem = document.getElementById('subscriptionResult');
    if (resultElem) {
        resultElem.style.display = 'none';
    }
}

// Show subscription message in the footer
function showSubscriptionMessage(message, type) {
    const resultElem = document.getElementById('subscriptionResult');
    if (resultElem) {
        resultElem.style.display = 'block';

        // Apply appropriate styling based on message type
        resultElem.className = 'mt-2 alert alert-' + (type === 'success' ? 'success' : 'danger') + ' py-2 px-3';

        // Add icon to message
        if (type === 'success') {
            resultElem.innerHTML = '<i class="fas fa-check-circle me-2"></i>' + message;
        } else {
            resultElem.innerHTML = '<i class="fas fa-exclamation-circle me-2"></i>' + message;
        }

        // Automatically hide the message after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                resultElem.style.display = 'none';
            }, 5000);
        }
    }
}

// Show page success message with animation for dedicated subscription/unsubscription pages
function showPageSuccessMessage(message) {
    // Find or create success container
    let successContainer = document.querySelector('.subscription-success-container');
    if (!successContainer) {
        successContainer = document.createElement('div');
        successContainer.className = 'subscription-success-container mt-4 text-center animate__animated animate__fadeIn';

        const formContainer = document.querySelector('.subscription-form-container');
        if (formContainer) {
            formContainer.parentNode.insertBefore(successContainer, formContainer.nextSibling);
            formContainer.style.display = 'none';
        }
    }

    // Create success content
    successContainer.innerHTML = `
        <div class="card border-success">
            <div class="card-body">
                <i class="fas fa-check-circle text-success fa-4x mb-3 animate__animated animate__bounceIn"></i>
                <h4 class="card-title text-success">${message}</h4>
                <p class="card-text mt-3">Cảm ơn bạn đã quan tâm đến dịch vụ của chúng tôi.</p>
            </div>
        </div>
    `;
}

// Email validation
function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// Thêm vào đoạn đã có trong DOMContentLoaded
const toggleSubscriptionMode = document.getElementById('toggleSubscriptionMode');
if (toggleSubscriptionMode) {
    console.log("Toggle button found, adding event listener");
    toggleSubscriptionMode.addEventListener('click', function (e) {
        console.log("Toggle button clicked");
        e.preventDefault();
        toggleSubscriptionForms();
    });
} else {
    console.error("Toggle button not found");
}
