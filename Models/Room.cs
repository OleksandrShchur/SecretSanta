namespace SecretSanta.Models;

public class Room
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string HostName { get; set; } = string.Empty;
    public long HostTelegramId { get; set; }
    public string? HostUsername { get; set; }
    public string AdminToken { get; set; } = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
    public string Status { get; set; } = "collecting"; // collecting | shuffled | closed
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Participant> Participants { get; set; } = new List<Participant>();
    public ICollection<Restriction> Restrictions { get; set; } = new List<Restriction>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}
