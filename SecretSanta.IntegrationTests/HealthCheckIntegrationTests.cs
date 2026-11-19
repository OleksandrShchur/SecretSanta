using System.Net;
using FluentAssertions;
using Xunit;

namespace SecretSanta.IntegrationTests;

public class HealthCheckIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public HealthCheckIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/api/health")]
    public async Task HealthEndpoints_GetMethod_ReturnsHealthyText(string endpoint)
    {
        var response = await _client.GetAsync(endpoint);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        string text = await response.Content.ReadAsStringAsync();
        text.Should().Be("Healthy");
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/api/health")]
    public async Task HealthEndpoints_HeadMethod_ReturnsSuccess(string endpoint)
    {
        using var request = new HttpRequestMessage(HttpMethod.Head, endpoint);
        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
