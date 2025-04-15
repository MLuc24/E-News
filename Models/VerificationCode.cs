using System;
using System.ComponentModel.DataAnnotations;

namespace WebBaoDienTu.Models
{
    public class VerificationCode
    {
        [Key]
        public int Id { get; set; }
        public string Email { get; set; } = null!;
        public string Code { get; set; } = null!;
        public DateTime ExpiresAt { get; set; }
        public bool IsUsed { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
