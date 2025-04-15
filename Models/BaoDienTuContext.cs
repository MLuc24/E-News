using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace WebBaoDienTu.Models
{
    public partial class BaoDienTuContext : DbContext
    {
        private readonly IConfiguration _configuration;

        public BaoDienTuContext(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public BaoDienTuContext(DbContextOptions<BaoDienTuContext> options, IConfiguration configuration)
            : base(options)
        {
            _configuration = configuration;
        }

        public virtual DbSet<Comment> Comments { get; set; }

        public virtual DbSet<Category> Categories { get; set; }
        public virtual DbSet<News> News { get; set; }
        public DbSet<NewsSharing> NewsSharing { get; set; } = null!;
        public virtual DbSet<Subscription> Subscriptions { get; set; }
        public virtual DbSet<User> Users { get; set; }

        public virtual DbSet<VerificationCode> VerificationCodes { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                var connectionString = _configuration.GetConnectionString("DefaultConnection");
                optionsBuilder.UseSqlServer(connectionString);
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Category>(entity =>
            {
                entity.HasKey(e => e.CategoryId).HasName("PK__Categori__D54EE9B464DC374C");

                entity.HasIndex(e => e.CategoryName, "UQ__Categori__5189E2553B2E3EC2").IsUnique();

                entity.Property(e => e.CategoryId).HasColumnName("category_id");
                entity.Property(e => e.CategoryName)
                    .HasMaxLength(255)
                    .HasColumnName("category_name");
            });

            modelBuilder.Entity<News>(entity =>
            {
                entity.HasKey(e => e.NewsId).HasName("PK__News__4C27CCD8946A0AC3");

                entity.HasIndex(e => e.AuthorId, "IX_News_author_id");

                entity.HasIndex(e => e.CategoryId, "IX_News_category_id");

                entity.Property(e => e.NewsId).HasColumnName("news_id");
                entity.Property(e => e.AuthorId).HasColumnName("author_id");
                entity.Property(e => e.CategoryId).HasColumnName("category_id");
                entity.Property(e => e.Content).HasColumnName("content");
                entity.Property(e => e.CreatedAt)
                    .HasDefaultValueSql("(getdate())")
                    .HasColumnType("datetime")
                    .HasColumnName("created_at");
                entity.Property(e => e.ReadCount)
                    .HasDefaultValue(0)
                    .HasColumnName("read_count");
                entity.Property(e => e.ImageUrl)
                    .HasMaxLength(500)
                    .HasColumnName("image_url");
                entity.Property(e => e.IsApproved)
                    .HasDefaultValue(false)
                    .HasColumnName("is_approved");
                entity.Property(e => e.Title)
                    .HasMaxLength(255)
                    .HasColumnName("title");

                entity.HasOne(d => d.Author).WithMany(p => p.News)
                    .HasForeignKey(d => d.AuthorId)
                    .OnDelete(DeleteBehavior.ClientSetNull)
                    .HasConstraintName("FK__News__author_id__412EB0B6");

                entity.HasOne(d => d.Category).WithMany(p => p.News)
                    .HasForeignKey(d => d.CategoryId)
                    .OnDelete(DeleteBehavior.ClientSetNull)
                    .HasConstraintName("FK__News__category_i__4222D4EF");
            });

            modelBuilder.Entity<NewsSharing>(entity =>
            {
                entity.HasKey(e => e.Id).HasName("PK__NewsSharing__3214EC07");

                entity.Property(e => e.Id)
                      .HasColumnName("share_id");

                entity.Property(e => e.NewsId)
                      .HasColumnName("news_id");

                entity.Property(e => e.UserId)
                      .HasColumnName("sender_id");

                entity.Property(e => e.RecipientEmail)
                      .HasMaxLength(255)
                      .HasColumnName("receiver_email");

                entity.Property(e => e.ShareDate)
                      .HasColumnType("datetime")
                      .HasColumnName("shared_at");

                // Định nghĩa mối quan hệ với News, bao gồm thuộc tính điều hướng ngược
                entity.HasOne(ns => ns.News)
                      .WithMany(n => n.NewsSharings) // Chỉ định thuộc tính điều hướng ngược
                      .HasForeignKey(ns => ns.NewsId)
                      .OnDelete(DeleteBehavior.Restrict)
                      .HasConstraintName("FK__NewsSharing__news_id");

                // Định nghĩa mối quan hệ với User, bao gồm thuộc tính điều hướng ngược
                entity.HasOne(ns => ns.User)
                      .WithMany(u => u.NewsSharings) // Chỉ định thuộc tính điều hướng ngược
                      .HasForeignKey(ns => ns.UserId)
                      .OnDelete(DeleteBehavior.Restrict)
                      .HasConstraintName("FK__NewsSharing__sender_id");
            });

            modelBuilder.Entity<Subscription>(entity =>
            {
                entity.HasKey(e => e.SubscriptionId).HasName("PK__Subscrip__863A7EC1CA7BC579");

                entity.Property(e => e.SubscriptionId).HasColumnName("subscription_id");
                entity.Property(e => e.SubscribedAt)
                    .HasDefaultValueSql("(getdate())")
                    .HasColumnType("datetime")
                    .HasColumnName("subscribed_at");
                entity.Property(e => e.UserEmail)
                    .HasMaxLength(255)
                    .HasColumnName("user_email");
            });

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.UserId).HasName("PK__Users__B9BE370FCC5C26E1");

                entity.HasIndex(e => e.Email, "UQ__Users__AB6E616488E3A22A").IsUnique();

                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.CreatedAt)
                    .HasDefaultValueSql("(getdate())")
                    .HasColumnType("datetime")
                    .HasColumnName("created_at");
                entity.Property(e => e.Email)
                    .HasMaxLength(255)
                    .HasColumnName("email");
                entity.Property(e => e.FullName)
                    .HasMaxLength(255)
                    .HasColumnName("full_name");
                entity.Property(e => e.PasswordHash)
                    .HasMaxLength(255)
                    .HasColumnName("password_hash");
                entity.Property(e => e.Role)
                    .HasMaxLength(50)
                    .HasColumnName("role");
                entity.Property(e => e.IsEmailVerified)
                    .HasColumnName("IsEmailVerified")  // Change from is_email_verified to IsEmailVerified
                    .HasDefaultValue(false);

            });

            modelBuilder.Entity<Comment>(entity =>
            {
                entity.HasKey(e => e.CommentId);

                entity.ToTable("Comments");

                entity.Property(e => e.Content)
                    .IsRequired()
                    .HasMaxLength(1000);

                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("(getdate())");

                entity.Property(e => e.GuestName).HasMaxLength(100);
                entity.Property(e => e.GuestEmail).HasMaxLength(255);

                entity.HasOne(d => d.News)
                    .WithMany(p => p.Comments)
                    .HasForeignKey(d => d.NewsId)
                    .OnDelete(DeleteBehavior.ClientSetNull)
                    .HasConstraintName("FK_Comments_News");

                entity.HasOne(d => d.User)
                    .WithMany(p => p.Comments)
                    .HasForeignKey(d => d.UserId)
                    .HasConstraintName("FK_Comments_Users");

                entity.HasOne(d => d.ParentComment)
                    .WithMany(p => p.Replies)
                    .HasForeignKey(d => d.ParentCommentId)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("FK_Comments_Comments");

                // Create indexes
                entity.HasIndex(e => e.NewsId).HasName("IX_Comments_NewsId");
                entity.HasIndex(e => e.UserId).HasName("IX_Comments_UserId");
                entity.HasIndex(e => e.ParentCommentId).HasName("IX_Comments_ParentCommentId");
            });

            modelBuilder.Entity<VerificationCode>(entity =>
            {
                entity.ToTable("VerificationCodes");
                entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt");
                entity.Property(e => e.ExpiresAt).HasColumnName("ExpiresAt");
                entity.Property(e => e.IsUsed).HasColumnName("IsUsed");
                entity.Property(e => e.Email).HasColumnName("Email");
                entity.Property(e => e.Code).HasColumnName("Code");
            });

            OnModelCreatingPartial(modelBuilder);
        }

        partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
    }
}
