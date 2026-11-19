using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using SecretSanta.Models;
using SecretSanta.Services;
using Xunit;

namespace SecretSanta.UnitTests;

public class TelegramServiceTests
{
    private readonly Mock<IHttpClientFactory> _mockHttpFactory = new();
    private readonly Mock<ILogger<TelegramService>> _mockLogger = new();

    private TelegramService CreateService(Dictionary<string, string?> configValues, HttpMessageHandler? handler = null)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configValues)
            .Build();

        if (handler != null)
        {
            var client = new HttpClient(handler);
            _mockHttpFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(client);
        }

        return new TelegramService(_mockHttpFactory.Object, configuration, _mockLogger.Object);
    }

    private static string GenerateValidInitData(string botToken, Dictionary<string, string> data)
    {
        var sortedPairs = data.OrderBy(k => k.Key, StringComparer.Ordinal)
            .Select(kv => $"{kv.Key}={kv.Value}");
        string dataCheckString = string.Join("\n", sortedPairs);

        byte[] secretKey = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes("WebAppData"),
            Encoding.UTF8.GetBytes(botToken)
        );

        byte[] hashBytes = HMACSHA256.HashData(
            secretKey,
            Encoding.UTF8.GetBytes(dataCheckString)
        );

        string hash = Convert.ToHexString(hashBytes).ToLowerInvariant();
        var allParts = data.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}").ToList();
        allParts.Add($"hash={hash}");

        return string.Join("&", allParts);
    }

    [Fact]
    public void IsConfigured_WhenTokenProvided_ReturnsTrue()
    {
        var service = CreateService(new Dictionary<string, string?>
        {
            ["Telegram:BotToken"] = "123456:ABC-DEF",
            ["Telegram:BotUsername"] = "SecretSantaBot"
        });

        service.IsConfigured.Should().BeTrue();
        service.BotUsername.Should().Be("SecretSantaBot");
    }

    [Fact]
    public void IsConfigured_WhenTokenMissing_ReturnsFalse()
    {
        var service = CreateService(new Dictionary<string, string?>());

        service.IsConfigured.Should().BeFalse();
        service.BotUsername.Should().BeNull();
    }

    [Fact]
    public void BotUsername_TrimsAtSymbol()
    {
        var service = CreateService(new Dictionary<string, string?>
        {
            ["Telegram:BotUsername"] = "  @MySantaBot  "
        });

        service.BotUsername.Should().Be("MySantaBot");
    }

    [Fact]
    public void ValidateTelegramInitData_WithValidData_ReturnsTrue()
    {
        // Arrange
        const string token = "987654:XYZ-Token";
        var service = CreateService(new Dictionary<string, string?>
        {
            ["Telegram:BotToken"] = token
        });

        var data = new Dictionary<string, string>
        {
            ["auth_date"] = "1700000000",
            ["query_id"] = "AAHdF6IQAAAAAN0XohD90v-b",
            ["user"] = "{\"id\":12345,\"first_name\":\"Test\",\"username\":\"testuser\"}"
        };

        string validInitData = GenerateValidInitData(token, data);

        // Act
        bool isValid = service.ValidateTelegramInitData(validInitData);

        // Assert
        isValid.Should().BeTrue();
    }

    [Fact]
    public void ValidateTelegramInitData_WithTamperedData_ReturnsFalse()
    {
        // Arrange
        const string token = "987654:XYZ-Token";
        var service = CreateService(new Dictionary<string, string?>
        {
            ["Telegram:BotToken"] = token
        });

        var data = new Dictionary<string, string>
        {
            ["auth_date"] = "1700000000",
            ["query_id"] = "query123",
            ["user"] = "{\"id\":12345}"
        };

        string validInitData = GenerateValidInitData(token, data);
        // Tamper with the user id in the initData string
        string tamperedInitData = validInitData.Replace("12345", "99999");

        // Act
        bool isValid = service.ValidateTelegramInitData(tamperedInitData);

        // Assert
        isValid.Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("auth_date=12345&user=test")] // Missing hash
    [InlineData("hash=")]
    [InlineData("random_garbage_without_equals")]
    public void ValidateTelegramInitData_WithInvalidFormat_ReturnsFalse(string invalidInitData)
    {
        var service = CreateService(new Dictionary<string, string?>
        {
            ["Telegram:BotToken"] = "token123"
        });

        service.ValidateTelegramInitData(invalidInitData).Should().BeFalse();
    }

    [Fact]
    public void ValidateTelegramInitData_WhenBotTokenNotConfigured_ReturnsFalse()
    {
        var service = CreateService(new Dictionary<string, string?>());

        service.ValidateTelegramInitData("auth_date=123&hash=abc").Should().BeFalse();
    }

    [Fact]
    public async Task SendTextMessageAsync_WhenChatIdIsZero_ReturnsFalseWithoutCallingApi()
    {
        var service = CreateService(new Dictionary<string, string?>
        {
            ["Telegram:BotToken"] = "token123"
        });

        bool result = await service.SendTextMessageAsync(0, "Hello");

        result.Should().BeFalse();
        _mockHttpFactory.Verify(f => f.CreateClient(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task SendTextMessageAsync_WhenBotTokenNotConfigured_LogsMockAndReturnsTrue()
    {
        var service = CreateService(new Dictionary<string, string?>());

        bool result = await service.SendTextMessageAsync(12345, "Hello Santa!");

        result.Should().BeTrue();
        _mockHttpFactory.Verify(f => f.CreateClient(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task SendTextMessageAsync_WhenConfiguredAndApiSucceeds_SendsPostAndReturnsTrue()
    {
        // Arrange
        const string botToken = "test_bot_token";
        string? capturedBody = null;
        Uri? capturedUri = null;
        HttpMethod? capturedMethod = null;

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Callback<HttpRequestMessage, CancellationToken>((req, _) =>
            {
                capturedUri = req.RequestUri;
                capturedMethod = req.Method;
                if (req.Content != null)
                {
                    capturedBody = req.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                }
            })
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("{\"ok\":true,\"result\":{}}")
            });

        var service = CreateService(new Dictionary<string, string?>
        {
            ["Telegram:BotToken"] = botToken
        }, handlerMock.Object);

        // Act
        bool result = await service.SendTextMessageAsync(777, "<b>Festive greeting!</b>");

        // Assert
        result.Should().BeTrue();
        capturedUri.Should().NotBeNull();
        capturedUri!.ToString().Should().Be($"https://api.telegram.org/bot{botToken}/sendMessage");
        capturedMethod.Should().Be(HttpMethod.Post);

        capturedBody.Should().NotBeNull();
        using var jsonDoc = JsonDocument.Parse(capturedBody!);
        jsonDoc.RootElement.GetProperty("chat_id").GetInt64().Should().Be(777);
        jsonDoc.RootElement.GetProperty("text").GetString().Should().Be("<b>Festive greeting!</b>");
        jsonDoc.RootElement.GetProperty("parse_mode").GetString().Should().Be("HTML");
    }

    [Fact]
    public async Task SendTextMessageAsync_WhenApiReturnsError_ReturnsFalse()
    {
        // Arrange
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.BadRequest,
                Content = new StringContent("{\"ok\":false,\"description\":\"Bad Request: chat not found\"}")
            });

        var service = CreateService(new Dictionary<string, string?>
        {
            ["Telegram:BotToken"] = "token123"
        }, handlerMock.Object);

        // Act
        bool result = await service.SendTextMessageAsync(12345, "Test");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task SendTextMessageAsync_WhenHttpCallThrows_ReturnsFalse()
    {
        // Arrange
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ThrowsAsync(new HttpRequestException("Connection timeout"));

        var service = CreateService(new Dictionary<string, string?>
        {
            ["Telegram:BotToken"] = "token123"
        }, handlerMock.Object);

        // Act
        bool result = await service.SendTextMessageAsync(12345, "Test");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task SendAssignmentNotificationAsync_ConstructsMessageWithWishlistAndButton()
    {
        // Arrange
        string? capturedBody = null;
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Callback<HttpRequestMessage, CancellationToken>((req, _) =>
            {
                if (req.Content != null)
                {
                    capturedBody = req.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                }
            })
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("{\"ok\":true}")
            });

        var service = CreateService(new Dictionary<string, string?>
        {
            ["Telegram:BotToken"] = "my_token"
        }, handlerMock.Object);

        var giver = new Participant
        {
            Id = Guid.NewGuid(),
            RoomId = Guid.NewGuid(),
            FirstName = "Олександр",
            TelegramId = 11111
        };

        var receiver = new Participant
        {
            Id = Guid.NewGuid(),
            RoomId = giver.RoomId,
            FirstName = "Марія",
            LastName = "Коваль",
            TelegramUsername = "maria_k",
            Wishlist = "Теплі шкарпетки <і> чашка"
        };

        // Act
        bool result = await service.SendAssignmentNotificationAsync(
            "Святковий офіс <2026>",
            giver,
            receiver,
            "https://secretsanta.com/app"
        );

        // Assert
        result.Should().BeTrue();
        capturedBody.Should().NotBeNull();
        using var doc = JsonDocument.Parse(capturedBody!);

        doc.RootElement.GetProperty("chat_id").GetInt64().Should().Be(11111);
        string text = doc.RootElement.GetProperty("text").GetString()!;

        // Check HTML encoding
        text.Should().Contain("&lt;2026&gt;");
        text.Should().Contain("&lt;і&gt;");
        text.Should().Contain("Марія Коваль");
        text.Should().Contain("@maria_k");
        text.Should().Contain("Теплі шкарпетки");

        // Check web_app button markup
        var markup = doc.RootElement.GetProperty("reply_markup");
        var keyboard = markup.GetProperty("inline_keyboard");
        keyboard.GetArrayLength().Should().Be(1);
        var button = keyboard[0][0];
        button.GetProperty("web_app").GetProperty("url").GetString().Should().Contain($"room={giver.RoomId}");
    }

    [Fact]
    public async Task SendAssignmentNotificationAsync_WhenNoWishlist_IncludesFriendlyDefault()
    {
        // Arrange
        string? capturedBody = null;
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Callback<HttpRequestMessage, CancellationToken>((req, _) =>
            {
                if (req.Content != null)
                {
                    capturedBody = req.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                }
            })
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("{\"ok\":true}")
            });

        var service = CreateService(new Dictionary<string, string?>
        {
            ["Telegram:BotToken"] = "token"
        }, handlerMock.Object);

        var giver = new Participant { RoomId = Guid.NewGuid(), FirstName = "Іван", TelegramId = 222 };
        var receiver = new Participant { RoomId = giver.RoomId, FirstName = "Петро", Wishlist = null };

        // Act
        await service.SendAssignmentNotificationAsync("Тестова кімната", giver, receiver, null);

        // Assert
        capturedBody.Should().NotBeNull();
        using var doc = JsonDocument.Parse(capturedBody!);
        string text = doc.RootElement.GetProperty("text").GetString()!;
        text.Should().Contain("не залишив особливих побажань");
        // No reply markup if webAppUrl is null
        doc.RootElement.TryGetProperty("reply_markup", out _).Should().BeFalse();
    }
}
