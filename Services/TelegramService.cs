using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using SecretSanta.Models;

namespace SecretSanta.Services;

public class TelegramService : ITelegramService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TelegramService> _logger;

    public TelegramService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<TelegramService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    private string? BotToken =>
        _configuration["Telegram:BotToken"] ??
        Environment.GetEnvironmentVariable("TELEGRAM_BOT_TOKEN");

    public string? BotUsername =>
        (_configuration["Telegram:BotUsername"] ??
        Environment.GetEnvironmentVariable("TELEGRAM_BOT_USERNAME"))?.Trim().TrimStart('@');

    public bool IsConfigured => !string.IsNullOrWhiteSpace(BotToken);

    public async Task<bool> SendAssignmentNotificationAsync(
        string roomTitle,
        Participant giver,
        Participant receiver,
        string? webAppUrl)
    {
        string receiverFullName = $"{receiver.FirstName} {receiver.LastName}".Trim();
        string receiverHandle = !string.IsNullOrWhiteSpace(receiver.TelegramUsername)
            ? $"(@{receiver.TelegramUsername.TrimStart('@')})"
            : string.Empty;

        string wishlistSection = !string.IsNullOrWhiteSpace(receiver.Wishlist)
            ? $"\n🎁 <b>Побажання до подарунка:</b>\n<i>{System.Net.WebUtility.HtmlEncode(receiver.Wishlist.Trim())}</i>\n"
            : "\n<i>(Підопічний не залишив особливих побажань — обери подарунок від щирого серця! 🎄)</i>\n";

        string text = $@"🎅 <b>Твій Таємний Санта: «{System.Net.WebUtility.HtmlEncode(roomTitle)}»</b>

Привіт, {System.Net.WebUtility.HtmlEncode(giver.FirstName)}! 🎄
Жеребкування успішно відбулося.

🎁 <b>Тобі випало дарувати подарунок для:</b>
<b>{System.Net.WebUtility.HtmlEncode(receiverFullName)}</b> {receiverHandle}
{wishlistSection}
🤫 <i>Пам'ятай: це секрет! Не видавай себе завчасно. Веселих свят! ✨</i>";

        object? replyMarkup = null;
        if (!string.IsNullOrWhiteSpace(webAppUrl) && webAppUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            replyMarkup = new
            {
                inline_keyboard = new[]
                {
                    new[]
                    {
                        new
                        {
                            text = "🎁 Відкрити кімнату в додатку",
                            web_app = new { url = webAppUrl }
                        }
                    }
                }
            };
        }

        return await SendTextMessageAsync(giver.TelegramId, text, replyMarkup);
    }

    public async Task<bool> SendTextMessageAsync(long chatId, string textHtml, object? replyMarkup = null)
    {
        if (chatId == 0)
        {
            _logger.LogWarning("Cannot send Telegram message: invalid chatId (0)");
            return false;
        }

        if (!IsConfigured)
        {
            _logger.LogInformation(
                "[DEMO/MOCK TELEGRAM] ChatId: {ChatId}\nMessage:\n{Text}",
                chatId,
                textHtml
            );
            return true;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            string endpoint = $"https://api.telegram.org/bot{BotToken}/sendMessage";

            var payload = new Dictionary<string, object>
            {
                ["chat_id"] = chatId,
                ["text"] = textHtml,
                ["parse_mode"] = "HTML"
            };

            if (replyMarkup != null)
            {
                payload["reply_markup"] = replyMarkup;
            }

            string json = JsonSerializer.Serialize(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.PostAsync(endpoint, content);
            string responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Telegram API error sending to {ChatId}: {Response}", chatId, responseBody);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send Telegram message to {ChatId}", chatId);
            return false;
        }
    }

    public bool ValidateTelegramInitData(string initData)
    {
        string? botToken = BotToken;
        if (string.IsNullOrWhiteSpace(botToken) || string.IsNullOrWhiteSpace(initData))
            return false;

        try
        {
            var parts = initData.Split('&', StringSplitOptions.RemoveEmptyEntries);
            var dict = new Dictionary<string, string>();
            string? hash = null;

            foreach (var part in parts)
            {
                int eqIdx = part.IndexOf('=');
                if (eqIdx <= 0) continue;
                string key = Uri.UnescapeDataString(part[..eqIdx]);
                string val = Uri.UnescapeDataString(part[(eqIdx + 1)..]);

                if (key == "hash")
                    hash = val;
                else
                    dict[key] = val;
            }

            if (string.IsNullOrWhiteSpace(hash)) return false;

            string dataCheckString = string.Join(
                "\n",
                dict.OrderBy(k => k.Key, StringComparer.Ordinal).Select(kv => $"{kv.Key}={kv.Value}")
            );

            byte[] secretKey = HMACSHA256.HashData(
                Encoding.UTF8.GetBytes("WebAppData"),
                Encoding.UTF8.GetBytes(botToken)
            );

            byte[] calculatedHashBytes = HMACSHA256.HashData(
                secretKey,
                Encoding.UTF8.GetBytes(dataCheckString)
            );

            string calculatedHash = Convert.ToHexString(calculatedHashBytes).ToLowerInvariant();
            return string.Equals(calculatedHash, hash, StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to validate Telegram initData");
            return false;
        }
    }
}
