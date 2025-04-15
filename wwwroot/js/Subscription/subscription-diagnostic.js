/**
 * subscription-diagnostic.js
 * Contains diagnostic functionality for the subscription management page
 */

// Diagnostic functions
function diagnoseEmailConfig() {
    $('#diagnosticLoadingIndicator').show();
    $('#diagnosticNotificationArea').hide();

    const token = $('#diagnosticEmailForm input[name="__RequestVerificationToken"]').val();

    $.ajax({
        url: '/Admin/Subscription/DiagnoseEmailConfig',
        type: 'POST',
        headers: {
            'RequestVerificationToken': token
        },
        dataType: 'json',
        success: function (result) {
            showDiagnosticResult('Cấu hình Email', result);
        },
        error: function (xhr, status, error) {
            showDiagnosticError('Cấu hình Email', 'Có lỗi xảy ra khi chẩn đoán cấu hình email');
        },
        complete: function () {
            $('#diagnosticLoadingIndicator').hide();
        }
    });
}

function diagnoseSubscribers() {
    $('#diagnosticLoadingIndicator').show();
    $('#diagnosticNotificationArea').hide();

    const token = $('#diagnosticEmailForm input[name="__RequestVerificationToken"]').val();

    $.ajax({
        url: '/Admin/Subscription/DiagnoseSubscribers',
        type: 'POST',
        headers: {
            'RequestVerificationToken': token
        },
        dataType: 'json',
        success: function (result) {
            showDiagnosticResult('Người đăng ký', result);
        },
        error: function (xhr, status, error) {
            showDiagnosticError('Người đăng ký', 'Có lỗi xảy ra khi chẩn đoán danh sách đăng ký');
        },
        complete: function () {
            $('#diagnosticLoadingIndicator').hide();
        }
    });
}

function diagnoseBackgroundTasks() {
    $('#diagnosticLoadingIndicator').show();
    $('#diagnosticNotificationArea').hide();

    const token = $('#diagnosticEmailForm input[name="__RequestVerificationToken"]').val();

    $.ajax({
        url: '/Admin/Subscription/DiagnoseBackgroundTasks',
        type: 'POST',
        headers: {
            'RequestVerificationToken': token
        },
        dataType: 'json',
        success: function (result) {
            showDiagnosticResult('Tác vụ ngầm', result);
        },
        error: function (xhr, status, error) {
            showDiagnosticError('Tác vụ ngầm', 'Có lỗi xảy ra khi chẩn đoán tác vụ ngầm');
        },
        complete: function () {
            $('#diagnosticLoadingIndicator').hide();
        }
    });
}

function checkConnection() {
    $('#diagnosticLoadingIndicator').show();
    $('#diagnosticNotificationArea').hide();

    const token = $('#diagnosticEmailForm input[name="__RequestVerificationToken"]').val();

    $.ajax({
        url: '/Admin/Subscription/TestSmtpConnection',
        type: 'POST',
        headers: {
            'RequestVerificationToken': token
        },
        dataType: 'json',
        success: function (result) {
            showDiagnosticResult('Kết nối SMTP', result);
        },
        error: function (xhr, status, error) {
            showDiagnosticError('Kết nối SMTP', 'Có lỗi xảy ra khi kiểm tra kết nối SMTP');
        },
        complete: function () {
            $('#diagnosticLoadingIndicator').hide();
        }
    });
}

// Run all diagnostics for comprehensive check
function runAllDiagnostics() {
    $('#diagnosticLoading').removeClass('d-none');
    $('#diagnosticResults').addClass('d-none');

    // Run all diagnostic tests
    Promise.all([
        runDiagnosticTest('emailConfig'),
        runDiagnosticTest('subscribers'),
        runDiagnosticTest('backgroundTasks')
    ]).then(results => {
        $('#diagnosticLoading').addClass('d-none');
        $('#diagnosticResults').removeClass('d-none');

        let html = '';

        // Email Config Result
        html += `<div class="mb-4">
                    <h5><i class="fas fa-envelope me-2 ${results[0].success ? 'text-success' : 'text-danger'}"></i>Cấu hình Email</h5>
                    <div class="card">
                        <div class="card-header ${results[0].success ? 'bg-success' : 'bg-danger'} text-white">
                            ${results[0].success ? 'Thành công' : 'Thất bại'}: ${results[0].message}
                        </div>
                        <div class="card-body">
                            ${generateDiagnosticDetailsHtml(results[0])}
                        </div>
                    </div>
                </div>`;

        // Subscribers Result
        html += `<div class="mb-4">
                    <h5><i class="fas fa-users me-2 ${results[1].success ? 'text-success' : 'text-danger'}"></i>Người đăng ký</h5>
                    <div class="card">
                        <div class="card-header ${results[1].success ? 'bg-success' : 'bg-danger'} text-white">
                            ${results[1].success ? 'Thành công' : 'Thất bại'}: ${results[1].message}
                        </div>
                        <div class="card-body">
                            ${generateDiagnosticDetailsHtml(results[1])}
                        </div>
                    </div>
                </div>`;

        // Background Tasks Result
        html += `<div class="mb-4">
                    <h5><i class="fas fa-tasks me-2 ${results[2].success ? 'text-success' : 'text-danger'}"></i>Tác vụ ngầm</h5>
                    <div class="card">
                        <div class="card-header ${results[2].success ? 'bg-success' : 'bg-danger'} text-white">
                            ${results[2].success ? 'Thành công' : 'Thất bại'}: ${results[2].message}
                        </div>
                        <div class="card-body">
                            ${generateDiagnosticDetailsHtml(results[2])}
                        </div>
                    </div>
                </div>`;

        // Overall Assessment
        const overallSuccess = results.every(r => r.success);
        html += `<div class="alert ${overallSuccess ? 'alert-success' : 'alert-warning'}">
                    <h5><i class="fas fa-${overallSuccess ? 'check-circle' : 'exclamation-triangle'} me-2"></i>Đánh giá tổng thể</h5>
                    <p class="mb-0">${overallSuccess
                ? 'Tất cả các thành phần đều hoạt động bình thường. Hệ thống thông báo email đã sẵn sàng.'
                : 'Một số thành phần có vấn đề. Hãy khắc phục các lỗi được liệt kê ở trên để đảm bảo hệ thống thông báo hoạt động bình thường.'}</p>
                </div>`;

        $('#diagnosticResults').html(html);
    }).catch(error => {
        $('#diagnosticLoading').addClass('d-none');
        $('#diagnosticResults').removeClass('d-none');
        $('#diagnosticResults').html(`
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Có lỗi xảy ra khi thực hiện chẩn đoán: ${error}
                    </div>
                `);
    });
}

function runDiagnosticByType(type) {
    $('#diagnosticLoading').removeClass('d-none');
    $('#diagnosticResults').addClass('d-none');

    if (type === 'all') {
        runAllDiagnostics();
        return;
    }

    let diagnosticFunction;
    let title = '';

    switch (type) {
        case 'email':
            diagnosticFunction = () => runDiagnosticTest('emailConfig');
            title = 'Cấu hình Email';
            break;
        case 'subscribers':
            diagnosticFunction = () => runDiagnosticTest('subscribers');
            title = 'Người đăng ký';
            break;
        case 'tasks':
            diagnosticFunction = () => runDiagnosticTest('backgroundTasks');
            title = 'Tác vụ ngầm';
            break;
        default:
            diagnosticFunction = () => Promise.resolve({ success: false, message: 'Loại chẩn đoán không hợp lệ' });
            title = 'Lỗi';
    }

    diagnosticFunction().then(result => {
        $('#diagnosticLoading').addClass('d-none');
        $('#diagnosticResults').removeClass('d-none');

        let html = `
                    <h5><i class="fas fa-${result.success ? 'check-circle text-success' : 'exclamation-triangle text-danger'} me-2"></i>${title}</h5>
                    <div class="card">
                        <div class="card-header ${result.success ? 'bg-success' : 'bg-danger'} text-white">
                            ${result.success ? 'Thành công' : 'Thất bại'}: ${result.message}
                        </div>
                        <div class="card-body">
                            ${generateDiagnosticDetailsHtml(result)}
                        </div>
                    </div>
                `;

        $('#diagnosticResults').html(html);
    }).catch(error => {
        $('#diagnosticLoading').addClass('d-none');
        $('#diagnosticResults').removeClass('d-none');
        $('#diagnosticResults').html(`
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Có lỗi xảy ra khi thực hiện chẩn đoán: ${error}
                    </div>
                `);
    });
}

function runDiagnosticTest(type) {
    return new Promise((resolve, reject) => {
        let url = '';

        switch (type) {
            case 'emailConfig':
                url = '/Admin/Subscription/DiagnoseEmailConfig';
                break;
            case 'subscribers':
                url = '/Admin/Subscription/DiagnoseSubscribers';
                break;
            case 'backgroundTasks':
                url = '/Admin/Subscription/DiagnoseBackgroundTasks';
                break;
            default:
                reject('Invalid diagnostic type');
                return;
        }

        // Get the antiforgery token
        const token = $('#diagnosticEmailForm input[name="__RequestVerificationToken"]').val();

        $.ajax({
            url: url,
            type: 'POST',
            headers: {
                'RequestVerificationToken': token
            },
            dataType: 'json',
            success: function (result) {
                try {
                    resolve(result);
                } catch (e) {
                    console.error("JSON parsing error:", e);
                    reject(e);
                }
            },
            error: function (xhr, status, error) {
                console.error(`${type} diagnosis error:`, error);
                console.error("Response:", xhr.responseText);
                console.error("Status:", xhr.status);

                let errorMsg = 'Có lỗi xảy ra khi chẩn đoán';
                if (xhr.status === 404) {
                    errorMsg = 'Không tìm thấy endpoint chẩn đoán';
                }

                reject(error);
            }
        });
    });
}

// Helper functions for displaying diagnostic results
function showDiagnosticResult(title, result) {
    const statusClass = result.success ? 'success' : 'danger';
    const icon = result.success ? 'check-circle' : 'exclamation-triangle';
    const statusText = result.success ? 'Thành công' : 'Lỗi';

    let html = `
    <div class="alert alert-${statusClass} alert-dismissible fade show shadow-sm" role="alert">
        <div class="d-flex align-items-center">
            <div class="flex-shrink-0">
                <i class="fas fa-${icon} fa-2x me-3"></i>
            </div>
            <div class="flex-grow-1">
                <h5 class="alert-heading d-flex justify-content-between">
                    <span>${title}: <strong>${statusText}</strong></span>
                    <button type="button" class="btn btn-sm btn-${statusClass} ms-3" data-bs-toggle="collapse" 
                          data-bs-target="#resultDetails" aria-expanded="false">
                        <i class="fas fa-info-circle me-1"></i> Chi tiết
                    </button>
                </h5>
                <p class="mb-0">${result.message}</p>
                
                <div class="collapse mt-3" id="resultDetails">
                    <div class="card card-body border-${statusClass}">
                        ${generateDiagnosticDetailsHtml(result)}
                    </div>
                </div>
            </div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;

    $('#diagnosticNotificationArea').html(html).show();

    // Scroll to the notification area
    $('html, body').animate({
        scrollTop: $("#diagnosticNotificationArea").offset().top - 100
    }, 500);
}

function showDiagnosticError(title, message) {
    let html = `
    <div class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
        <div class="d-flex align-items-center">
            <div class="flex-shrink-0">
                <i class="fas fa-exclamation-triangle fa-2x me-3"></i>
            </div>
            <div class="flex-grow-1">
                <h5 class="alert-heading">${title}: <strong>Lỗi</strong></h5>
                <p class="mb-0">${message}</p>
            </div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;

    $('#diagnosticNotificationArea').html(html).show();

    // Scroll to the notification area
    $('html, body').animate({
        scrollTop: $("#diagnosticNotificationArea").offset().top - 100
    }, 500);
}

// Generate diagnostic details HTML from result
function generateDiagnosticDetailsHtml(result) {
    let html = '';

    // Add details section if available
    if (result.details) {
        html += '<div class="mb-3"><h6>Chi tiết:</h6><ul class="list-group">';

        // Convert result.details to array of key-value pairs
        Object.entries(result.details).forEach(([key, value]) => {
            if (key !== 'issues' && key !== 'testConnectionResult' && key !== 'errors' &&
                key !== 'recentTasks' && key !== 'recommendations' && key !== 'emailDetails') {

                let displayValue = value;
                if (typeof value === 'object' && value !== null) {
                    displayValue = JSON.stringify(value);
                }

                html += `<li class="list-group-item"><strong>${key}:</strong> ${displayValue}</li>`;
            }
        });

        html += '</ul></div>';

        // Add issues if any
        if (result.details.issues && result.details.issues.length) {
            html += '<div class="mb-3"><h6 class="text-danger">Vấn đề:</h6><ul class="list-group">';
            result.details.issues.forEach(issue => {
                html += `<li class="list-group-item list-group-item-danger">${issue}</li>`;
            });
            html += '</ul></div>';
        }

        // Add test connection result if any
        if (result.details.testConnectionResult) {
            const connResult = result.details.testConnectionResult;
            html += `<div class="alert ${connResult.success ? 'alert-success' : 'alert-danger'}">
                        <strong>Test kết nối:</strong> ${connResult.message || 'Không có thông tin'}
                    </div>`;
        }

        // Add recent tasks if any
        if (result.details.recentTasks && result.details.recentTasks.length) {
            html += '<div class="mb-3"><h6>Tác vụ gần đây:</h6><table class="table table-sm">';
            html += '<thead><tr><th>Thời gian</th><th>Loại</th><th>Trạng thái</th></tr></thead><tbody>';
            result.details.recentTasks.forEach(task => {
                html += `<tr>
                            <td>${task.timestamp}</td>
                            <td>${task.taskType}</td>
                            <td><span class="badge ${task.successful ? 'bg-success' : 'bg-danger'}">${task.successful ? 'Thành công' : 'Thất bại'}</span></td>
                        </tr>`;
            });
            html += '</tbody></table></div>';
        }

        // Add errors if any
        if (result.details.errors && result.details.errors.length) {
            html += '<div class="mb-3"><h6 class="text-danger">Lỗi:</h6><ul class="list-group">';
            result.details.errors.forEach(error => {
                html += `<li class="list-group-item list-group-item-danger">
                            <strong>${error.errorType}:</strong> ${error.message}<br/>
                            <small class="text-muted">${error.timestamp}</small>
                        </li>`;
            });
            html += '</ul></div>';
        }
    }

    // Add recommendations section if available
    if (result.recommendations && result.recommendations.length) {
        html += '<div class="mt-3"><h6>Khuyến nghị:</h6>';

        result.recommendations.forEach((rec, index) => {
            html += `
                    <div class="card mb-2">
                        <div class="card-header bg-info text-white py-2">
                            <strong>${rec.title}</strong>
                        </div>
                        <div class="card-body py-2">
                            <p class="mb-2">${rec.description}</p>
                            ${rec.code ? `<pre class="bg-light p-2 mb-0"><code>${rec.code}</code></pre>` : ''}
                        </div>
                    </div>`;
        });

        html += '</div>';
    }

    return html || '<div class="text-muted">Không có thông tin chi tiết</div>';
}

// Initialize diagnostic functionality
document.addEventListener('DOMContentLoaded', function () {
    // Override the events
    $('#diagnoseEmailConfigBtn').on('click', function () {
        diagnoseEmailConfig();
    });

    $('#diagnoseSubscribersBtn').on('click', function () {
        diagnoseSubscribers();
    });

    $('#diagnoseBackgroundTasksBtn').on('click', function () {
        diagnoseBackgroundTasks();
    });

    $('#checkConnectionBtn').on('click', function () {
        checkConnection();
    });

    // Diagnostic modal actions
    $('#runDiagnosticsBtn').on('click', function () {
        runAllDiagnostics();
    });

    $('#runDiagnosticsAgainBtn').on('click', function () {
        const activeType = $('.diagnostic-option.active').data('type');
        runDiagnosticByType(activeType);
    });

    $('.diagnostic-option').on('click', function () {
        $('.diagnostic-option').removeClass('active');
        $(this).addClass('active');

        const type = $(this).data('type');
        runDiagnosticByType(type);
    });
});
