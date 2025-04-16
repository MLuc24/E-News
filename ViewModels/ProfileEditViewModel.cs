using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace WebBaoDienTu.ViewModels
{
    public class ProfileEditViewModel
    {
        [Required(ErrorMessage = "Vui lòng nhập họ và tên")]
        [MaxLength(255, ErrorMessage = "Họ và tên không được vượt quá 255 ký tự")]
        [Display(Name = "Họ và tên")]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(20, ErrorMessage = "Số điện thoại không được vượt quá 20 ký tự")]
        [Display(Name = "Số điện thoại")]
        [RegularExpression(@"^\d{10,11}$", ErrorMessage = "Số điện thoại không hợp lệ")]
        public string? PhoneNumber { get; set; }

        [MaxLength(255, ErrorMessage = "Địa chỉ không được vượt quá 255 ký tự")]
        [Display(Name = "Địa chỉ")]
        public string? Address { get; set; }

        [Display(Name = "Ngày sinh")]
        [DataType(DataType.Date)]
        public DateTime? DateOfBirth { get; set; }

        [MaxLength(500, ErrorMessage = "Giới thiệu không được vượt quá 500 ký tự")]
        [Display(Name = "Giới thiệu bản thân")]
        public string? Bio { get; set; }

        [Display(Name = "Giới tính")]
        public string? Gender { get; set; } // "male", "female", "other"

        [Display(Name = "Ảnh đại diện")]
        public IFormFile? Avatar { get; set; }

        [Display(Name = "Ảnh đại diện hiện tại")]
        public string? ExistingAvatar { get; set; }
    }
}
