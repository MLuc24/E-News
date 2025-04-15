using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebBaoDienTu.Models
{
    public class NewsSharing
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int NewsId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [EmailAddress]
        public string RecipientEmail { get; set; } = null!;

        public DateTime ShareDate { get; set; }
        public bool IsRead { get; set; } = false;
        [Required]
        public News News { get; set; } = null!;

        [Required]
        public User User { get; set; } = null!;

        [Required]
        public string Message { get; set; } = string.Empty; // Ensure Message is initialized
    }
}