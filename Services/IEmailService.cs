using SecretSanta.Models;

namespace SecretSanta.Services;

public interface IEmailService
{
    Task<bool> SendAssignmentEmailAsync(string roomTitle, Participant giver, Participant receiver);
    Task<bool> SendInviteEmailAsync(string roomTitle, string hostName, string toEmail, string inviteUrl);
}
