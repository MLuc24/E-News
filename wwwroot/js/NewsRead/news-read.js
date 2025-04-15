// news-read.js - JavaScript functionality for the news reading page
document.addEventListener('DOMContentLoaded', function () {
    // --- READ COUNT TRACKING ---
    const newsId = document.getElementById('newsId')?.value;
    if (!newsId) {
        console.error("News ID not found");
        return;
    }

    // Biến để theo dõi trạng thái đọc
    let isReading = false;          // Đang đọc bài viết không
    let readingStartTime = null;    // Thời điểm bắt đầu đọc
    let totalReadTime = 0;          // Tổng thời gian đọc (ms)
    let lastIncrementTime = 0;      // Thời gian lần cuối tăng lượt đọc
    let readCheckInterval;          // Biến để lưu interval check

    // Tạo clientId nếu chưa có
    function getClientId() {
        let clientId = localStorage.getItem('news_reader_client_id');
        if (!clientId) {
            // Tạo ID ngẫu nhiên cho client
            clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('news_reader_client_id', clientId);
        }
        return clientId;
    }

    // Tạo ID định danh cho phiên đọc cụ thể này
    function getReadSessionId() {
        return 'read_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Xử lý thay đổi trạng thái hiển thị trang
    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            // Người dùng quay lại đọc bài viết
            if (!isReading) {
                startReading();
            }
        } else {
            // Người dùng rời khỏi bài viết
            if (isReading) {
                pauseReading();
            }
        }
    }

    // Bắt đầu theo dõi thời gian đọc
    function startReading() {
        isReading = true;
        readingStartTime = Date.now();

        // Bắt đầu kiểm tra thời gian đọc mỗi giây
        readCheckInterval = setInterval(checkReadingTime, 1000);

        console.log('Bắt đầu đọc bài viết');
    }

    // Tạm dừng theo dõi thời gian đọc
    function pauseReading() {
        if (readingStartTime) {
            // Cộng thêm khoảng thời gian đã đọc
            totalReadTime += Date.now() - readingStartTime;
            readingStartTime = null;
        }

        isReading = false;
        clearInterval(readCheckInterval);

        console.log(`Tạm dừng đọc bài viết. Tổng thời gian đọc: ${Math.floor(totalReadTime / 1000)}s`);
    }

    // Kiểm tra nếu đã đọc đủ 30 giây thì tăng lượt đọc
    function checkReadingTime() {
        // Tính tổng thời gian đọc hiện tại
        let currentTotalReadTime = totalReadTime;
        if (readingStartTime) {
            currentTotalReadTime += Date.now() - readingStartTime;
        }

        // Nếu đã đọc ít nhất 30 giây từ lần tăng lượt đọc cuối
        const timeElapsedSinceLastIncrement = Math.floor(currentTotalReadTime / 1000) - Math.floor(lastIncrementTime / 1000);

        if (timeElapsedSinceLastIncrement >= 30) {
            incrementReadCount(currentTotalReadTime);
        }
    }

    // Hàm tăng lượt đọc
    function incrementReadCount(currentReadTime) {
        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
        if (!token) {
            console.error("Anti-forgery token not found");
            return;
        }

        const clientId = getClientId();
        const readSessionId = getReadSessionId();
        const readTimeSeconds = Math.floor(currentReadTime / 1000);

        // Cập nhật lần cuối tăng lượt đọc
        lastIncrementTime = currentReadTime;

        fetch(`/News/IncrementReadCount/${newsId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'RequestVerificationToken': token
            },
            body: `clientId=${encodeURIComponent(clientId)}&sessionId=${encodeURIComponent(readSessionId)}&readTimeSeconds=${readTimeSeconds}`
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Cập nhật số lượt đọc trên trang
                    const readCountElement = document.getElementById('read-count');
                    if (readCountElement) {
                        readCountElement.textContent = data.newCount;
                    }

                    console.log(`Đã cập nhật lượt đọc thành công: ${data.newCount} sau ${readTimeSeconds}s`);
                }
            })
            .catch(error => {
                console.error("Lỗi khi cập nhật lượt đọc:", error);
            });
    }

    // Đăng ký sự kiện khi thay đổi tab
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Đăng ký các sự kiện tương tác người dùng để biết họ đang đọc
    const userEvents = ['scroll', 'mousedown', 'touchstart', 'keydown'];
    userEvents.forEach(event => {
        document.addEventListener(event, function () {
            if (!isReading && document.visibilityState === 'visible') {
                startReading();
            }
        });
    });

    // Kiểm tra và bắt đầu theo dõi nếu trang đang được hiển thị
    if (document.visibilityState === 'visible') {
        startReading();
    }

    // --- EMAIL SHARING FUNCTIONALITY ---
    const currentUserEmail = document.querySelector('meta[name="user-email"]')?.getAttribute('content');
    const shareForm = document.getElementById('shareForm');
    const emailInput = document.getElementById('email');
    const shareButton = document.querySelector('.btn-share');
    const errorMessageDiv = document.getElementById('shareErrorMessage');

    if (shareForm && emailInput && currentUserEmail) {
        emailInput.addEventListener('input', validateEmail);
        shareForm.addEventListener('submit', function (e) {
            if (!validateEmail()) {
                e.preventDefault();
            }
        });

        function validateEmail() {
            const recipientEmail = emailInput.value.trim().toLowerCase();

            if (recipientEmail === currentUserEmail.toLowerCase()) {
                errorMessageDiv.textContent = 'Bạn không thể chia sẻ bài viết cho chính mình';
                errorMessageDiv.style.display = 'block';
                shareButton.disabled = true;
                return false;
            } else {
                errorMessageDiv.textContent = '';
                errorMessageDiv.style.display = 'none';
                shareButton.disabled = false;
                return true;
            }
        }
    }

    // --- NOTIFICATION HANDLING ---
    const successNotification = document.querySelector('.success-notification');
    if (successNotification) {
        setTimeout(function () {
            successNotification.style.opacity = '0';
            setTimeout(function () {
                successNotification.style.display = 'none';
            }, 500);
        }, 3000);
    }

    // Dọn dẹp khi người dùng rời trang
    window.addEventListener('beforeunload', function () {
        if (isReading) {
            pauseReading();
        }
        clearInterval(readCheckInterval);
    });
});
