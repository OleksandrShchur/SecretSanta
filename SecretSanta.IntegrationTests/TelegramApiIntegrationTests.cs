using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Moq;
using SecretSanta.DTOs;
using Xunit;

namespace SecretSanta.IntegrationTests;

public class TelegramApiIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public TelegramApiIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetConfig_ReturnsConfiguredTelegramSettings()
    {
        var response = await _client.GetAsync("/api/telegram/config");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var config = await response.Content.ReadFromJsonAsync<TelegramConfigDto>();
        config.Should().NotBeNull();
        config!.BotUsername.Should().Be("IntegrationTestBot");
        config.Configured.Should().BeTrue();
        config.AppShortName.Should().Be("santa_app");
    }

    [Fact]
    public async Task Webhook_WithStartCommand_TriggersTelegramMessage()
    {
        var updatePayload = new
        {
            update_id = 999,
            message = new
            {
                chat = new { id = 777123 },
                text = "/start"
            }
        };

        var response = await _client.PostAsJsonAsync("/api/telegram/webhook", updatePayload);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        _factory.MockTelegramService.Verify(t => t.SendTextMessageAsync(
            777123,
            It.Is<string>(txt => txt.Contains("Вітаємо")),
            It.IsAny<object?>()
        ), Times.AtLeastOnce);
    }

    [Fact]
    public async Task Webhook_WithDeepLinkRoomParam_TriggersRoomInviteMessage()
    {
        var updatePayload = new
        {
            update_id = 1000,
            message = new
            {
                chat = new { id = 888123 },
                text = "/start room_12345"
            }
        };

        var response = await _client.PostAsJsonAsync("/api/telegram/webhook", updatePayload);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        _factory.MockTelegramService.Verify(t => t.SendTextMessageAsync(
            888123,
            It.Is<string>(txt => txt.Contains("Вас запрошено")),
            It.IsAny<object?>()
        ), Times.AtLeastOnce);
    }
}
