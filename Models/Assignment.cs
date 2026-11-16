namespace SecretSanta.Models;

public class Assignment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoomId { get; set; }
    public Guid GiverId { get; set; }
    public Guid ReceiverId { get; set; }
    public bool EmailSent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Room? Room { get; set; }
    public Participant? Giver { get; set; }
    public Participant? Receiver { get; set; }
}
