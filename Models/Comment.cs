using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebBaoDienTu.Models
{
    public class Comment
    {
        public int CommentId { get; set; }

        [Required]
        [StringLength(1000, ErrorMessage = "Nội dung không được vượt quá 1000 ký tự.")]
        public string Content { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? UpdatedAt { get; set; }

        // For tracking deleted comments without removing them
        public bool IsDeleted { get; set; } = false;

        // Foreign keys
        public int NewsId { get; set; }

        public int? UserId { get; set; }

        // For guest comments
        [StringLength(100)]
        public string? GuestName { get; set; }

        [StringLength(255)]
        [EmailAddress]
        public string? GuestEmail { get; set; }

        // For comment replies - self-referencing relationship
        public int? ParentCommentId { get; set; }

        // Navigation properties
        [ForeignKey("NewsId")]
        public virtual News News { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [ForeignKey("ParentCommentId")]
        public virtual Comment? ParentComment { get; set; }

        public virtual ICollection<Comment> Replies { get; set; } = new List<Comment>();
    }
}
