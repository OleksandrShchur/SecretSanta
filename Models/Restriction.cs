namespace SecretSanta.Models;

public class Restriction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoomId { get; set; }
    public Guid GiverId { get; set; }
    public Guid ReceiverId { get; set; }

    public Room? Room { get; set; }
    public Participant? Giver { get; set; }
    public Participant? Receiver { get; set; }
}
