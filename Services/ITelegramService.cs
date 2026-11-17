using SecretSanta.Models;

namespace SecretSanta.Services;

public interface ITelegramService
{
    string? BotUsername { get; }
    bool IsConfigured { get; }

    Task<bool> SendAssignmentNotificationAsync(string roomTitle, Participant giver, Participant receiver, string? webAppUrl);
    Task<bool> SendTextMessageAsync(long chatId, string textHtml, object? replyMarkup = null);
    bool ValidateTelegramInitData(string initData);
}
