// Models/SocialLogin.cs
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebBaoDienTu.Models
{
    public class SocialLogin
    {
        [Key]
        public int SocialLoginId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(20)]
        public string Provider { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string ProviderUserId { get; set; } = null!;

        [MaxLength(500)]
        public string? ProviderAccessToken { get; set; }

        [MaxLength(500)]
        public string? ProviderRefreshToken { get; set; }

        public DateTime? TokenExpiresAt { get; set; }

        public string? ProfileDataJson { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
    }
}
