using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using SecretSanta.Controllers;
using SecretSanta.DTOs;
using SecretSanta.Services;
using Xunit;

namespace SecretSanta.UnitTests;

public class TelegramControllerUnitTests
{
    private readonly Mock<ITelegramService> _mockTelegramService = new();
    private readonly Mock<ILogger<TelegramController>> _mockLogger = new();

    private TelegramController CreateController(Dictionary<string, string?> configValues)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(configValues)
            .Build();

        return new TelegramController(_mockTelegramService.Object, config, _mockLogger.Object);
    }

    [Fact]
    public void GetConfig_ReturnsExpectedConfiguration()
    {
        // Arrange
        _mockTelegramService.SetupGet(s => s.BotUsername).Returns("MySantaBot");
        _mockTelegramService.SetupGet(s => s.IsConfigured).Returns(true);

        var controller = CreateController(new Dictionary<string, string?>
        {
            ["Telegram:AppShortName"] = "santa_app"
        });

        // Act
        var result = controller.GetConfig();

        // Assert
        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<TelegramConfigDto>().Subject;
        dto.BotUsername.Should().Be("MySantaBot");
        dto.Configured.Should().BeTrue();
        dto.AppShortName.Should().Be("santa_app");
    }

    [Fact]
    public async Task Webhook_WhenUpdateHasNoMessage_ReturnsOkWithoutAction()
    {
        var controller = CreateController(new Dictionary<string, string?>());
        using var jsonDoc = JsonDocument.Parse("{\"update_id\":123}");

        var result = await controller.Webhook(jsonDoc.RootElement);

        result.Should().BeOfType<OkResult>();
        _mockTelegramService.Verify(s => s.SendTextMessageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<object?>()), Times.Never);
    }

    [Fact]
    public async Task Webhook_WhenUpdateIsStartCommand_SendsWelcomeMessage()
    {
        // Arrange
        var controller = CreateController(new Dictionary<string, string?>
        {
            ["Telegram:WebAppUrl"] = "https://secretsanta.test/app"
        });

        string updateJson = @"
        {
            ""update_id"": 1,
            ""message"": {
                ""chat"": { ""id"": 987654 },
                ""text"": ""/start""
            }
        }";
        using var doc = JsonDocument.Parse(updateJson);

        // Act
        var result = await controller.Webhook(doc.RootElement);

        // Assert
        result.Should().BeOfType<OkResult>();
        _mockTelegramService.Verify(s => s.SendTextMessageAsync(
            987654,
            It.Is<string>(text => text.Contains("Вітаємо у «Таємному Санті»")),
            It.IsNotNull<object?>()
        ), Times.Once);
    }

    [Fact]
    public async Task Webhook_WhenUpdateIsStartWithRoomParameter_SendsRoomInviteMessage()
    {
        // Arrange
        var controller = CreateController(new Dictionary<string, string?>
        {
            ["Telegram:WebAppUrl"] = "https://secretsanta.test/app"
        });

        string updateJson = @"
        {
            ""update_id"": 2,
            ""message"": {
                ""chat"": { ""id"": 112233 },
                ""text"": ""/start room_abc-123""
            }
        }";
        using var doc = JsonDocument.Parse(updateJson);

        // Act
        var result = await controller.Webhook(doc.RootElement);

        // Assert
        result.Should().BeOfType<OkResult>();
        _mockTelegramService.Verify(s => s.SendTextMessageAsync(
            112233,
            It.Is<string>(text => text.Contains("Вас запрошено до кімнати")),
            It.IsNotNull<object?>()
        ), Times.Once);
    }
}
