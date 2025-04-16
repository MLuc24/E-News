// Models/User.cs - Updated
using System;
using System.Collections.Generic;

namespace WebBaoDienTu.Models
{
    public partial class User
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string PasswordHash { get; set; } = null!;
        public string Role { get; set; } = null!;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public bool IsDeleted { get; set; } = false;
        public bool IsEmailVerified { get; set; } = false;

        public virtual ICollection<News> News { get; set; } = new List<News>();
        public virtual ICollection<NewsSharing> NewsSharings { get; set; } = new List<NewsSharing>();
        public virtual ICollection<Comment> Comments { get; set; } = new List<Comment>();

        // Models/User.cs - Add these properties to your existing User class
        public virtual UserProfile? Profile { get; set; }
        public virtual ICollection<SocialLogin> SocialLogins { get; set; } = new List<SocialLogin>();
        public virtual ICollection<UserSession> UserSessions { get; set; } = new List<UserSession>();
    }
}
