using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using SecretSanta.DTOs;
using SecretSanta.Services;

namespace SecretSanta.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TelegramController : ControllerBase
{
    private readonly ITelegramService _telegramService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TelegramController> _logger;

    public TelegramController(
        ITelegramService telegramService,
        IConfiguration configuration,
        ILogger<TelegramController> logger)
    {
        _telegramService = telegramService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("config")]
    public ActionResult<TelegramConfigDto> GetConfig()
    {
        string appShortName = _configuration["Telegram:AppShortName"] ?? "app";
        return Ok(new TelegramConfigDto(
            _telegramService.BotUsername ?? string.Empty,
            _telegramService.IsConfigured,
            appShortName
        ));
    }

    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook([FromBody] JsonElement update)
    {
        try
        {
            if (!update.TryGetProperty("message", out var message))
            {
                return Ok();
            }

            if (!message.TryGetProperty("chat", out var chat) ||
                !chat.TryGetProperty("id", out var chatIdProp))
            {
                return Ok();
            }

            long chatId = chatIdProp.GetInt64();
            string text = message.TryGetProperty("text", out var textProp)
                ? textProp.GetString() ?? string.Empty
                : string.Empty;

            string? webAppUrl = _configuration["Telegram:WebAppUrl"]
                ?? Environment.GetEnvironmentVariable("TELEGRAM_WEBAPP_URL")
                ?? Environment.GetEnvironmentVariable("WEBAPP_URL");

            if (text.StartsWith("/start", StringComparison.OrdinalIgnoreCase))
            {
                string param = text.Length > 6 ? text[6..].Trim() : string.Empty;

                string replyText;
                object? replyMarkup = null;

                string targetUrl = !string.IsNullOrWhiteSpace(webAppUrl) ? webAppUrl.TrimEnd('/') : string.Empty;
                if (!string.IsNullOrWhiteSpace(param) && !string.IsNullOrWhiteSpace(targetUrl))
                {
                    string roomId = param.StartsWith("room_", StringComparison.OrdinalIgnoreCase)
                        ? param[5..]
                        : param;
                    string sep = targetUrl.Contains('?') ? "&" : "?";
                    targetUrl = $"{targetUrl}{sep}room={roomId}";
                }

                if (!string.IsNullOrWhiteSpace(param))
                {
                    replyText = "🎅 <b>Вас запрошено до кімнати «Таємного Санти»!</b>\n\nНатисніть кнопку нижче, щоб відкрити додаток та приєднатися до розіграшу:";
                }
                else
                {
                    replyText = "🎅 <b>Вітаємо у «Таємному Санті»!</b>\n\nТут ви можете створювати святкові кімнати, запрошувати друзів і таємно обмінюватися подарунками.\n\nНатисніть кнопку нижче, щоб відкрити додаток:";
                }

                if (!string.IsNullOrWhiteSpace(targetUrl) && targetUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                {
                    replyMarkup = new
                    {
                        inline_keyboard = new[]
                        {
                            new[]
                            {
                                new
                                {
                                    text = "🎅 Відкрити Таємного Санту",
                                    web_app = new { url = targetUrl }
                                }
                            }
                        }
                    };
                }

                await _telegramService.SendTextMessageAsync(chatId, replyText, replyMarkup);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling Telegram webhook");
        }

        return Ok();
    }
}
