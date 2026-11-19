using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using SecretSanta.Data;
using SecretSanta.Models;
using SecretSanta.Services;

namespace SecretSanta.IntegrationTests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = Guid.NewGuid().ToString();
    public Mock<ITelegramService> MockTelegramService { get; } = new();

    public CustomWebApplicationFactory()
    {
        MockTelegramService.Setup(t => t.IsConfigured).Returns(true);
        MockTelegramService.Setup(t => t.BotUsername).Returns("IntegrationTestBot");
        MockTelegramService.Setup(t => t.SendAssignmentNotificationAsync(
                It.IsAny<string>(),
                It.IsAny<Participant>(),
                It.IsAny<Participant>(),
                It.IsAny<string?>()))
            .ReturnsAsync(true);
        MockTelegramService.Setup(t => t.SendTextMessageAsync(
                It.IsAny<long>(),
                It.IsAny<string>(),
                It.IsAny<object?>()))
            .ReturnsAsync(true);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["UseInMemoryDatabase"] = "true",
                ["InMemoryDatabaseName"] = _dbName,
                ["Telegram:BotToken"] = "test_bot_token_123",
                ["Telegram:BotUsername"] = "IntegrationTestBot",
                ["Telegram:WebAppUrl"] = "https://secretsanta.test/app",
                ["Telegram:AppShortName"] = "santa_app"
            });
        });

        builder.ConfigureServices(services =>
        {
            // Replace ITelegramService with Mock
            var telegramDescriptors = services.Where(
                d => d.ServiceType == typeof(ITelegramService)).ToList();
            foreach (var td in telegramDescriptors)
            {
                services.Remove(td);
            }
            services.AddSingleton(MockTelegramService.Object);
        });
    }

    public SecretSantaDbContext GetDbContext()
    {
        var scope = Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<SecretSantaDbContext>();
    }
}
