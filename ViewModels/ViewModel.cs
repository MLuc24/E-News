using System.ComponentModel.DataAnnotations;

namespace WebBaoDienTu.ViewModels
{
    public class LoginViewModel
    {
        [Required(ErrorMessage = "Email không được để trống")]
        [EmailAddress(ErrorMessage = "Định dạng email không hợp lệ")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mật khẩu không được để trống")]
        public string Password { get; set; } = string.Empty;

        public bool RememberMe { get; set; }
    }

    public class RegisterViewModel
    {
        [Required(ErrorMessage = "Họ tên không được để trống")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email không được để trống")]
        [EmailAddress(ErrorMessage = "Định dạng email không hợp lệ")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mật khẩu không được để trống")]
        [StringLength(8, MinimumLength = 6, ErrorMessage = "Mật khẩu phải từ 6-8 ký tự")]
        [RegularExpression(@"^(?=.*[A-Z])(?=.*\d).+$",
            ErrorMessage = "Mật khẩu phải chứa ít nhất một chữ cái in hoa và một số")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Xác nhận mật khẩu không được để trống")]
        [Compare("Password", ErrorMessage = "Mật khẩu xác nhận không khớp")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    public class ChangePasswordModel
    {
        [Required(ErrorMessage = "Mật khẩu hiện tại không được để trống")]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mật khẩu mới không được để trống")]
        [StringLength(8, MinimumLength = 6, ErrorMessage = "Mật khẩu phải từ 6-8 ký tự")]
        [RegularExpression(@"^(?=.*[A-Z])(?=.*\d).+$",
            ErrorMessage = "Mật khẩu phải chứa ít nhất một chữ cái in hoa và một số")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Xác nhận mật khẩu không được để trống")]
        [Compare("NewPassword", ErrorMessage = "Mật khẩu xác nhận không khớp")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    public class EmailVerificationViewModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Code { get; set; } = string.Empty;
    }

    public class ResendVerificationViewModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }

    public class PendingRegistration
    {
        public string Email { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string PasswordHash { get; set; } = null!;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime ExpiresAt { get; set; }
    }

    // Add these to ViewModels/ViewModel.cs

    public class CommentViewModel
    {
        [Required(ErrorMessage = "Nội dung không được để trống")]
        [StringLength(1000, ErrorMessage = "Nội dung không được vượt quá 1000 ký tự")]
        public string? Content { get; set; }

        [Required]
        public int NewsId { get; set; }

        public int? ParentCommentId { get; set; }

        // For guest comments
        [StringLength(100)]
        public string? GuestName { get; set; }

        [EmailAddress]
        public string? GuestEmail { get; set; }
    }

    public class UpdateCommentViewModel
    {
        [Required(ErrorMessage = "Nội dung không được để trống")]
        [StringLength(1000, ErrorMessage = "Nội dung không được vượt quá 1000 ký tự")]
        public string? Content { get; set; }
    }

    public class EmailValidationViewModel
    {
        public string? Email { get; set; }
    }

}
