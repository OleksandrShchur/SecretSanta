using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using SecretSanta.DTOs;
using SecretSanta.Models;
using Xunit;

namespace SecretSanta.IntegrationTests;

public class RoomsApiIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public RoomsApiIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CompleteRoomLifecycle_EndToEnd_Succeeds()
    {
        // 1. Create a room with host participation
        var createRequest = new CreateRoomRequest(
            Title: "Team New Year 2026",
            HostFirstName: "Oleksandr",
            HostLastName: "Shchur",
            HostTelegramId: 10001,
            HostUsername: "alex_shchur",
            HostParticipates: true,
            HostWishlist: "Mechanical keyboard"
        );

        var createResponse = await _client.PostAsJsonAsync("/api/rooms", createRequest);
        if (!createResponse.IsSuccessStatusCode)
        {
            var error = await createResponse.Content.ReadAsStringAsync();
            throw new Exception($"Create room failed with {(int)createResponse.StatusCode}: {error}");
        }
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var adminRoom = await createResponse.Content.ReadFromJsonAsync<RoomAdminDto>();
        adminRoom.Should().NotBeNull();
        adminRoom!.Title.Should().Be("Team New Year 2026");
        adminRoom.HostName.Should().Be("Oleksandr Shchur");
        adminRoom.Status.Should().Be("collecting");
        adminRoom.Participants.Should().HaveCount(1);
        adminRoom.AdminToken.Should().NotBeNullOrWhiteSpace();

        var roomId = adminRoom.Id;
        var adminToken = adminRoom.AdminToken;
        var hostParticipantId = adminRoom.Participants[0].Id;

        // 2. Public view check
        var publicResponse = await _client.GetAsync($"/api/rooms/{roomId}?telegramId=10001");
        publicResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var publicRoom = await publicResponse.Content.ReadFromJsonAsync<RoomPublicDto>();
        publicRoom.Should().NotBeNull();
        publicRoom!.ParticipantCount.Should().Be(1);
        publicRoom.MyRegistration.Should().NotBeNull();
        publicRoom.MyRegistration!.FirstName.Should().Be("Oleksandr");
        publicRoom.MyRegistration.Wishlist.Should().Be("Mechanical keyboard");

        // 3. Add Participant 2
        var part2Req = new CreateParticipantRequest("Maria", "Koval", 10002, "maria_k", "Socks & Tea");
        var part2Res = await _client.PostAsJsonAsync($"/api/rooms/{roomId}/participants", part2Req);
        part2Res.StatusCode.Should().Be(HttpStatusCode.OK);
        var part2Dto = await part2Res.Content.ReadFromJsonAsync<ParticipantDto>();
        part2Dto.Should().NotBeNull();
        part2Dto!.FirstName.Should().Be("Maria");

        // 4. Add Participant 3
        var part3Req = new CreateParticipantRequest("Ivan", "Petrenko", 10003, "ivan_p", "Coffee Beans");
        var part3Res = await _client.PostAsJsonAsync($"/api/rooms/{roomId}/participants", part3Req);
        part3Res.StatusCode.Should().Be(HttpStatusCode.OK);
        var part3Dto = await part3Res.Content.ReadFromJsonAsync<ParticipantDto>();
        part3Dto.Should().NotBeNull();
        part3Dto!.FirstName.Should().Be("Ivan");

        // 5. Updating existing participant (Participant 2 updates wishlist)
        var updatePart2Req = new CreateParticipantRequest("Maria", "Koval", 10002, "maria_k", "Updated: Warm Blanket");
        var updatePart2Res = await _client.PostAsJsonAsync($"/api/rooms/{roomId}/participants", updatePart2Req);
        updatePart2Res.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedPart2Dto = await updatePart2Res.Content.ReadFromJsonAsync<ParticipantDto>();
        updatedPart2Dto!.Wishlist.Should().Be("Updated: Warm Blanket");

        // 6. Admin view shows 3 participants
        var adminViewRes = await _client.GetAsync($"/api/rooms/{roomId}/admin?adminToken={adminToken}");
        adminViewRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var adminView = await adminViewRes.Content.ReadFromJsonAsync<RoomAdminDto>();
        adminView!.Participants.Should().HaveCount(3);

        // 7. Save restriction: Oleksandr cannot give to Maria
        var saveRestReq = new SaveRestrictionsRequest(
        [
            new RestrictionItem(hostParticipantId, part2Dto.Id)
        ]);
        var saveRestRes = await _client.PostAsJsonAsync($"/api/rooms/{roomId}/restrictions?adminToken={adminToken}", saveRestReq);
        saveRestRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 8. Conduct Shuffle
        var shuffleRes = await _client.PostAsync($"/api/rooms/{roomId}/shuffle?adminToken={adminToken}", null);
        shuffleRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var shuffleData = await shuffleRes.Content.ReadFromJsonAsync<ShuffleResponse>();
        shuffleData.Should().NotBeNull();
        shuffleData!.Success.Should().BeTrue();
        shuffleData.TotalParticipants.Should().Be(3);
        shuffleData.NotificationsSent.Should().Be(3);

        // Verify TelegramService was called for all 3 participants
        _factory.MockTelegramService.Verify(t => t.SendAssignmentNotificationAsync(
            "Team New Year 2026",
            It.IsAny<Participant>(),
            It.IsAny<Participant>(),
            It.IsAny<string?>()
        ), Times.AtLeast(3));

        // 9. Fetch personal assignment for Host
        var assignRes = await _client.GetAsync($"/api/rooms/{roomId}/my-assignment?telegramId=10001");
        assignRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var assignDto = await assignRes.Content.ReadFromJsonAsync<MyAssignmentDto>();
        assignDto.Should().NotBeNull();
        assignDto!.RoomTitle.Should().Be("Team New Year 2026");
        // Because of restriction, Oleksandr cannot give to Maria, so must give to Ivan
        assignDto.ReceiverFirstName.Should().Be("Ivan");

        // 10. Attempting to add participant after shuffle is rejected
        var lateReq = new CreateParticipantRequest("Late", "Guy", 99999, null, null);
        var lateRes = await _client.PostAsJsonAsync($"/api/rooms/{roomId}/participants", lateReq);
        lateRes.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // 11. Attempting to shuffle again is rejected
        var reshuffleRes = await _client.PostAsync($"/api/rooms/{roomId}/shuffle?adminToken={adminToken}", null);
        reshuffleRes.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // 12. Query user's hosted rooms
        var myRoomsRes = await _client.GetAsync("/api/rooms/my?telegramId=10001");
        myRoomsRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var myRooms = await myRoomsRes.Content.ReadFromJsonAsync<List<RoomSummaryDto>>();
        myRooms.Should().NotBeNull();
        myRooms!.Should().Contain(r => r.Id == roomId);

        // 13. Query user's participating rooms (for participant 2)
        var participatingRes = await _client.GetAsync("/api/rooms/participating?telegramId=10002");
        participatingRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var participatingRooms = await participatingRes.Content.ReadFromJsonAsync<List<RoomParticipationDto>>();
        participatingRooms.Should().NotBeNull();
        participatingRooms!.Should().Contain(r => r.Id == roomId);

        // 14. Deactivate Room
        var deactivateRes = await _client.PatchAsync($"/api/rooms/{roomId}/deactivate?adminToken={adminToken}", null);
        deactivateRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 15. Delete Room
        var deleteRes = await _client.DeleteAsync($"/api/rooms/{roomId}?adminToken={adminToken}");
        deleteRes.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify room is deleted
        var getDeletedRes = await _client.GetAsync($"/api/rooms/{roomId}");
        getDeletedRes.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task AdminEndpoints_WithInvalidToken_ReturnUnauthorized()
    {
        // Arrange: Create room
        var createRequest = new CreateRoomRequest("Auth Test Room", "Host", null, 8888, null, false, null);
        var res = await _client.PostAsJsonAsync("/api/rooms", createRequest);
        var room = await res.Content.ReadFromJsonAsync<RoomAdminDto>();
        var roomId = room!.Id;

        // Act & Assert Admin View
        var getAdminRes = await _client.GetAsync($"/api/rooms/{roomId}/admin?adminToken=invalid_token");
        getAdminRes.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // Act & Assert Deactivate
        var deactRes = await _client.PatchAsync($"/api/rooms/{roomId}/deactivate?adminToken=invalid_token", null);
        deactRes.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // Act & Assert Delete
        var delRes = await _client.DeleteAsync($"/api/rooms/{roomId}?adminToken=invalid_token");
        delRes.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // Act & Assert Shuffle
        var shuffleRes = await _client.PostAsync($"/api/rooms/{roomId}/shuffle?adminToken=invalid_token", null);
        shuffleRes.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Shuffle_WithLessThan3Participants_ReturnsBadRequest()
    {
        // Arrange
        var createRequest = new CreateRoomRequest("Small Room", "Host", null, 7777, null, true, null);
        var res = await _client.PostAsJsonAsync("/api/rooms", createRequest);
        var room = await res.Content.ReadFromJsonAsync<RoomAdminDto>();

        // Act: Only 1 participant (the host)
        var shuffleRes = await _client.PostAsync($"/api/rooms/{room!.Id}/shuffle?adminToken={room.AdminToken}", null);

        // Assert
        shuffleRes.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        string err = await shuffleRes.Content.ReadAsStringAsync();
        err.Should().Contain("щонайменше 3");
    }
}
