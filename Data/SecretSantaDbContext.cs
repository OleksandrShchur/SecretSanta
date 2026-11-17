using Microsoft.EntityFrameworkCore;
using SecretSanta.Models;

namespace SecretSanta.Data;

public class SecretSantaDbContext : DbContext
{
    public SecretSantaDbContext(DbContextOptions<SecretSantaDbContext> options) : base(options)
    {
    }

    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Participant> Participants => Set<Participant>();
    public DbSet<Restriction> Restrictions => Set<Restriction>();
    public DbSet<Assignment> Assignments => Set<Assignment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Room
        modelBuilder.Entity<Room>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.HostName).IsRequired().HasMaxLength(150);
            entity.Property(e => e.HostTelegramId).IsRequired();
            entity.Property(e => e.HostUsername).HasMaxLength(100);
            entity.Property(e => e.AdminToken).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => e.AdminToken);
        });

        // Participant
        modelBuilder.Entity<Participant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).HasMaxLength(100);
            entity.Property(e => e.TelegramId).IsRequired();
            entity.Property(e => e.TelegramUsername).HasMaxLength(100);
            entity.Property(e => e.Wishlist).HasMaxLength(2000);

            entity.HasOne(e => e.Room)
                .WithMany(r => r.Participants)
                .HasForeignKey(e => e.RoomId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.RoomId, e.TelegramId }).IsUnique();
        });

        // Restriction
        modelBuilder.Entity<Restriction>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.Room)
                .WithMany(r => r.Restrictions)
                .HasForeignKey(e => e.RoomId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Giver)
                .WithMany()
                .HasForeignKey(e => e.GiverId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(e => e.Receiver)
                .WithMany()
                .HasForeignKey(e => e.ReceiverId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(e => new { e.RoomId, e.GiverId, e.ReceiverId }).IsUnique();
        });

        // Assignment
        modelBuilder.Entity<Assignment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NotificationSent).IsRequired();

            entity.HasOne(e => e.Room)
                .WithMany(r => r.Assignments)
                .HasForeignKey(e => e.RoomId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Giver)
                .WithMany()
                .HasForeignKey(e => e.GiverId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(e => e.Receiver)
                .WithMany()
                .HasForeignKey(e => e.ReceiverId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(e => new { e.RoomId, e.GiverId }).IsUnique();
        });
    }
}
