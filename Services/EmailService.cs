using System.Text;
using System.Text.Json;
using SecretSanta.Models;

namespace SecretSanta.Services;

public class EmailService : IEmailService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<EmailService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    private string? ResendApiKey =>
        _configuration["Resend:ApiKey"] ??
        Environment.GetEnvironmentVariable("RESEND_API_KEY");

    public async Task<bool> SendAssignmentEmailAsync(string roomTitle, Participant giver, Participant receiver)
    {
        string html = BuildAssignmentHtml(roomTitle, giver.FirstName, receiver);
        string subject = $"🎅 Твій Таємний Санта: «{roomTitle}»";

        return await SendViaResendAsync(giver.Email, subject, html);
    }

    public async Task<bool> SendInviteEmailAsync(string roomTitle, string hostName, string toEmail, string inviteUrl)
    {
        string html = BuildInviteHtml(roomTitle, hostName, inviteUrl);
        string subject = $"🎄 Запрошення: Таємний Санта «{roomTitle}»";

        return await SendViaResendAsync(toEmail, subject, html);
    }

    private async Task<bool> SendViaResendAsync(string toEmail, string subject, string htmlContent)
    {
        string? apiKey = ResendApiKey;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogInformation("[DEMO/MOCK EMAIL] To: {To}, Subject: {Subject}", toEmail, subject);
            return true;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            var payload = new
            {
                from = _configuration["Resend:FromEmail"] ?? "Таємний Санта <santa@resend.dev>",
                to = new[] { toEmail },
                subject,
                html = htmlContent
            };

            string json = JsonSerializer.Serialize(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.PostAsync("https://api.resend.com/emails", content);
            if (!response.IsSuccessStatusCode)
            {
                string err = await response.Content.ReadAsStringAsync();
                _logger.LogError("Resend error sending to {To}: {Error}", toEmail, err);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", toEmail);
            return false;
        }
    }

    private static string BuildAssignmentHtml(string roomTitle, string giverName, Participant receiver)
    {
        string wishlistBlock = !string.IsNullOrWhiteSpace(receiver.Wishlist)
            ? $@"<div style=""background-color: #fff9e6; border-left: 4px solid #b8860b; padding: 12px 16px; margin-top: 15px; border-radius: 4px; text-align: left;"">
                   <strong style=""color: #b8860b; font-size: 14px;"">🎁 Побажання до подарунка:</strong>
                   <p style=""margin: 8px 0 0; color: #333; font-style: italic; white-space: pre-line;"">{System.Net.WebUtility.HtmlEncode(receiver.Wishlist.Trim())}</p>
                 </div>"
            : @"<p style=""color: #666; font-size: 14px; margin-top: 12px; font-style: italic;"">(Підопічний не залишив особливих побажань — обери подарунок від щирого серця! 🎄)</p>";

        return $@"
        <!DOCTYPE html>
        <html>
        <head><meta charset=""utf-8""><title>Таємний Санта</title></head>
        <body style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f9f7; margin: 0; padding: 24px; color: #333;"">
          <div style=""max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e0e0e0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06);"">
            <div style=""background: linear-gradient(135deg, #8a0000 0%, #b30000 100%); padding: 30px 20px; text-align: center; color: white;"">
              <h1 style=""margin: 0; font-size: 26px; font-weight: 800;"">🎅 Твій Таємний Санта</h1>
              <p style=""margin: 8px 0 0; font-size: 16px; opacity: 0.95;"">Кімната: «{System.Net.WebUtility.HtmlEncode(roomTitle)}»</p>
            </div>
            <div style=""padding: 30px 24px; text-align: center;"">
              <h2 style=""color: #006400; margin-top: 0; font-size: 20px;"">Привіт, {System.Net.WebUtility.HtmlEncode(giverName)}! 🎄</h2>
              <p style=""font-size: 15px; line-height: 1.5; color: #555;"">Жеребкування успішно відбулося. Твій щасливий підопічний:</p>
              <div style=""background: #f0fdf4; border: 2px dashed #006400; border-radius: 8px; padding: 20px; margin: 24px 0;"">
                <div style=""font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #006400; font-weight: bold;"">Тобі випало дарувати подарунок:</div>
                <div style=""font-size: 24px; font-weight: 800; color: #8a0000; margin: 10px 0;"">{System.Net.WebUtility.HtmlEncode(receiver.FirstName)} {System.Net.WebUtility.HtmlEncode(receiver.LastName)}</div>
                <div style=""font-size: 14px; color: #555;"">✉️ Email: <a href=""mailto:{receiver.Email}"" style=""color: #006400; text-decoration: underline;"">{receiver.Email}</a></div>
                {wishlistBlock}
              </div>
              <p style=""font-size: 14px; color: #777; line-height: 1.5; margin-top: 20px;"">🤫 <strong>Пам'ятай:</strong> це секрет! Не розкривай себе до моменту вручення подарунка.</p>
            </div>
            <div style=""background-color: #fafafa; border-top: 1px solid #eee; padding: 16px; text-align: center; font-size: 12px; color: #999;"">З любов'ю, Організатор Таємного Санти 🎅✨</div>
          </div>
        </body>
        </html>";
    }

    private static string BuildInviteHtml(string roomTitle, string hostName, string inviteUrl)
    {
        return $@"
        <!DOCTYPE html>
        <html>
        <head><meta charset=""utf-8""><title>Запрошення</title></head>
        <body style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f9f7; margin: 0; padding: 24px; color: #333;"">
          <div style=""max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e0e0e0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06);"">
            <div style=""background: linear-gradient(135deg, #006400 0%, #008000 100%); padding: 30px 20px; text-align: center; color: white;"">
              <h1 style=""margin: 0; font-size: 26px; font-weight: 800;"">🎄 Запрошення до Таємного Санти</h1>
              <p style=""margin: 8px 0 0; font-size: 16px; opacity: 0.95;"">Кімната: «{System.Net.WebUtility.HtmlEncode(roomTitle)}»</p>
            </div>
            <div style=""padding: 30px 24px; text-align: center;"">
              <p style=""font-size: 16px; line-height: 1.6; color: #444; margin-top: 0;""><strong>{System.Net.WebUtility.HtmlEncode(hostName)}</strong> запрошує вас взяти участь у новорічному розіграші <strong>«{System.Net.WebUtility.HtmlEncode(roomTitle)}»</strong>! 🎅🎁</p>
              <p style=""font-size: 14px; color: #666; line-height: 1.5; margin: 15px 0 25px;"">Перейдіть за посиланням нижче, щоб заповнити своє ім'я, прізвище та побажання для вашого Таємного Санти:</p>
              <a href=""{inviteUrl}"" style=""display: inline-block; background-color: #c00; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 10px rgba(204,0,0,0.25);"">Приєднатися до кімнати ➔</a>
              <div style=""margin-top: 30px; padding: 14px; background: #fdfdfd; border: 1px solid #eee; border-radius: 6px; word-break: break-all; font-size: 12px; color: #777;"">Або скопіюйте посилання: <br><a href=""{inviteUrl}"" style=""color: #006400;"">{inviteUrl}</a></div>
            </div>
            <div style=""background-color: #fafafa; border-top: 1px solid #eee; padding: 16px; text-align: center; font-size: 12px; color: #999;"">Організатор Таємного Санти 🎅✨</div>
          </div>
        </body>
        </html>";
    }
}
