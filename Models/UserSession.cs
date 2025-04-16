// Models/UserSession.cs
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebBaoDienTu.Models
{
    public class UserSession
    {
        [Key]
        public int SessionId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(500)]
        public string Token { get; set; } = null!;

        [MaxLength(255)]
        public string? DeviceInfo { get; set; }

        [MaxLength(50)]
        public string? IpAddress { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime LastActivity { get; set; } = DateTime.Now;

        public DateTime ExpiresAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
    }
}
