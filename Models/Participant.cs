namespace SecretSanta.Models;

public class Participant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoomId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Wishlist { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Room? Room { get; set; }
}
