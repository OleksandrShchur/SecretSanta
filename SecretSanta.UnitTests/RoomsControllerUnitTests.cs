using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using SecretSanta.Controllers;
using SecretSanta.Data;
using SecretSanta.DTOs;
using SecretSanta.Models;
using SecretSanta.Services;
using Xunit;

namespace SecretSanta.UnitTests;

public class RoomsControllerUnitTests : IDisposable
{
    private readonly SecretSantaDbContext _db;
    private readonly Mock<ISecretSantaAlgorithm> _mockAlgorithm = new();
    private readonly Mock<ITelegramService> _mockTelegramService = new();
    private readonly IConfiguration _configuration;
    private readonly RoomsController _controller;

    public RoomsControllerUnitTests()
    {
        var dbOptions = new DbContextOptionsBuilder<SecretSantaDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new SecretSantaDbContext(dbOptions);

        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Telegram:WebAppUrl"] = "https://secretsanta.test/app"
            })
            .Build();

        _controller = new RoomsController(_db, _mockAlgorithm.Object, _mockTelegramService.Object, _configuration);
    }

    public void Dispose()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
        GC.SuppressFinalize(this);
    }

    [Theory]
    [InlineData("", "HostName", 123)]
    [InlineData("   ", "HostName", 123)]
    [InlineData("RoomTitle", "", 123)]
    [InlineData("RoomTitle", "HostName", 0)]
    public async Task Create_WithMissingRequiredFields_ReturnsBadRequest(string title, string hostFirst, long tgId)
    {
        var req = new CreateRoomRequest(title, hostFirst, "Last", tgId, "@host", true, "Wish");

        var result = await _controller.Create(req);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Create_WithHostParticipating_CreatesRoomAndHostParticipant()
    {
        var req = new CreateRoomRequest("Holiday Party", "Oleksandr", "Shchur", 99999, "@alex", true, "Board game");

        var result = await _controller.Create(req);

        var created = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var dto = created.Value.Should().BeOfType<RoomAdminDto>().Subject;

        dto.Title.Should().Be("Holiday Party");
        dto.HostName.Should().Be("Oleksandr Shchur");
        dto.HostTelegramId.Should().Be(99999);
        dto.Status.Should().Be("collecting");
        dto.Participants.Should().HaveCount(1);
        dto.Participants[0].FirstName.Should().Be("Oleksandr");
        dto.Participants[0].Wishlist.Should().Be("Board game");

        var savedRoom = await _db.Rooms.Include(r => r.Participants).FirstOrDefaultAsync(r => r.Id == dto.Id);
        savedRoom.Should().NotBeNull();
        savedRoom!.Participants.Should().HaveCount(1);
    }

    [Fact]
    public async Task Create_WithoutHostParticipating_CreatesRoomWithZeroParticipants()
    {
        var req = new CreateRoomRequest("Office Draw", "Boss", null, 12345, null, false, null);

        var result = await _controller.Create(req);

        var created = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var dto = created.Value.Should().BeOfType<RoomAdminDto>().Subject;

        dto.Participants.Should().BeEmpty();
        var savedRoom = await _db.Rooms.Include(r => r.Participants).FirstOrDefaultAsync(r => r.Id == dto.Id);
        savedRoom!.Participants.Should().BeEmpty();
    }

    [Fact]
    public async Task GetMyRooms_WithValidTelegramId_ReturnsUserRooms()
    {
        var r1 = new Room { Title = "Room 1", HostName = "Host", HostTelegramId = 555, Status = "collecting" };
        var r2 = new Room { Title = "Room 2", HostName = "Host", HostTelegramId = 555, Status = "shuffled" };
        var r3 = new Room { Title = "Room 3", HostName = "Other", HostTelegramId = 777, Status = "collecting" };
        _db.Rooms.AddRange(r1, r2, r3);
        await _db.SaveChangesAsync();

        var result = await _controller.GetMyRooms(555);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var list = ok.Value.Should().BeAssignableTo<List<RoomSummaryDto>>().Subject;
        list.Should().HaveCount(2);
        list.Select(r => r.Title).Should().Contain(["Room 1", "Room 2"]);
    }

    [Fact]
    public async Task GetParticipatingRooms_ReturnsRoomsWhereUserIsParticipant()
    {
        var r1 = new Room { Title = "Room 1", HostName = "Host 1", HostTelegramId = 111, Status = "collecting" };
        var r2 = new Room { Title = "Room 2", HostName = "Host 2", HostTelegramId = 222, Status = "collecting" };
        _db.Rooms.AddRange(r1, r2);

        var p1 = new Participant { RoomId = r1.Id, FirstName = "Ivan", TelegramId = 999 };
        var p2 = new Participant { RoomId = r2.Id, FirstName = "Ivan", TelegramId = 888 };
        _db.Participants.AddRange(p1, p2);
        await _db.SaveChangesAsync();

        var result = await _controller.GetParticipatingRooms(999);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var list = ok.Value.Should().BeAssignableTo<List<RoomParticipationDto>>().Subject;
        list.Should().HaveCount(1);
        list[0].Title.Should().Be("Room 1");
    }

    [Fact]
    public async Task Deactivate_WhenValidAdminToken_SetsStatusToClosed()
    {
        var room = new Room { Title = "Test Room", HostName = "Host", HostTelegramId = 123, Status = "collecting" };
        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        var result = await _controller.Deactivate(room.Id, room.AdminToken);

        result.Should().BeOfType<OkObjectResult>();
        var updated = await _db.Rooms.FindAsync(room.Id);
        updated!.Status.Should().Be("closed");
    }

    [Fact]
    public async Task Deactivate_WhenInvalidAdminToken_ReturnsUnauthorized()
    {
        var room = new Room { Title = "Test Room", HostName = "Host", HostTelegramId = 123 };
        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        var result = await _controller.Deactivate(room.Id, "wrong_token");

        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task DeleteRoom_WhenValidAdminToken_DeletesRoom()
    {
        var room = new Room { Title = "To Delete", HostName = "Host", HostTelegramId = 123 };
        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        var result = await _controller.DeleteRoom(room.Id, room.AdminToken);

        result.Should().BeOfType<NoContentResult>();
        (await _db.Rooms.FindAsync(room.Id)).Should().BeNull();
    }

    [Fact]
    public async Task GetPublic_ReturnsPublicDataAndMyRegistrationIfProvided()
    {
        var room = new Room { Title = "Public Party", HostName = "Host", HostTelegramId = 111, Status = "collecting" };
        _db.Rooms.Add(room);
        var p1 = new Participant { RoomId = room.Id, FirstName = "Anna", LastName = "B", TelegramId = 222, Wishlist = "Books" };
        var p2 = new Participant { RoomId = room.Id, FirstName = "Oleg", LastName = "C", TelegramId = 333 };
        _db.Participants.AddRange(p1, p2);
        await _db.SaveChangesAsync();

        var result = await _controller.GetPublic(room.Id, 222);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<RoomPublicDto>().Subject;

        dto.Title.Should().Be("Public Party");
        dto.ParticipantCount.Should().Be(2);
        dto.Participants.Should().HaveCount(2);
        dto.MyRegistration.Should().NotBeNull();
        dto.MyRegistration!.FirstName.Should().Be("Anna");
        dto.MyRegistration.Wishlist.Should().Be("Books");
    }

    [Fact]
    public async Task GetAdmin_WithValidToken_ReturnsFullDataIncludingRestrictions()
    {
        var room = new Room { Title = "Admin Test", HostName = "Host", HostTelegramId = 111 };
        _db.Rooms.Add(room);
        var p1 = new Participant { RoomId = room.Id, FirstName = "User1", TelegramId = 222 };
        var p2 = new Participant { RoomId = room.Id, FirstName = "User2", TelegramId = 333 };
        _db.Participants.AddRange(p1, p2);
        var rest = new Restriction { RoomId = room.Id, GiverId = p1.Id, ReceiverId = p2.Id };
        _db.Restrictions.Add(rest);
        await _db.SaveChangesAsync();

        var result = await _controller.GetAdmin(room.Id, room.AdminToken);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<RoomAdminDto>().Subject;
        dto.Participants.Should().HaveCount(2);
        dto.Restrictions.Should().HaveCount(1);
        dto.Restrictions[0].GiverId.Should().Be(p1.Id);
    }

    [Fact]
    public async Task AddParticipant_WhenCollecting_AddsNewParticipant()
    {
        var room = new Room { Title = "Open Room", HostName = "Host", HostTelegramId = 1, Status = "collecting" };
        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        var req = new CreateParticipantRequest("Maks", "L", 777, "@maks", "Socks");
        var result = await _controller.AddParticipant(room.Id, req);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<ParticipantDto>().Subject;
        dto.FirstName.Should().Be("Maks");
        dto.TelegramId.Should().Be(777);

        var saved = await _db.Participants.FirstOrDefaultAsync(p => p.RoomId == room.Id && p.TelegramId == 777);
        saved.Should().NotBeNull();
    }

    [Fact]
    public async Task AddParticipant_WhenAlreadyRegistered_UpdatesExistingRegistration()
    {
        var room = new Room { Title = "Open Room", HostName = "Host", HostTelegramId = 1, Status = "collecting" };
        _db.Rooms.Add(room);
        var original = new Participant
        {
            RoomId = room.Id,
            FirstName = "OldName",
            TelegramId = 777,
            Wishlist = "Old Wish"
        };
        _db.Participants.Add(original);
        await _db.SaveChangesAsync();

        var req = new CreateParticipantRequest("NewName", "NewLast", 777, "@new", "New Wish");
        var result = await _controller.AddParticipant(room.Id, req);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<ParticipantDto>().Subject;
        dto.FirstName.Should().Be("NewName");
        dto.Wishlist.Should().Be("New Wish");

        var allParts = await _db.Participants.Where(p => p.RoomId == room.Id).ToListAsync();
        allParts.Should().HaveCount(1, "Should update existing participant, not add duplicate");
    }

    [Fact]
    public async Task AddParticipant_WhenRoomShuffled_ReturnsBadRequest()
    {
        var room = new Room { Title = "Shuffled Room", HostName = "Host", HostTelegramId = 1, Status = "shuffled" };
        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        var req = new CreateParticipantRequest("Maks", "L", 777, null, null);
        var result = await _controller.AddParticipant(room.Id, req);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task RemoveParticipant_WhenValid_RemovesFromDb()
    {
        var room = new Room { Title = "Room", HostName = "Host", HostTelegramId = 1, Status = "collecting" };
        _db.Rooms.Add(room);
        var part = new Participant { RoomId = room.Id, FirstName = "ToRemove", TelegramId = 555 };
        _db.Participants.Add(part);
        await _db.SaveChangesAsync();

        var result = await _controller.RemoveParticipant(room.Id, part.Id, room.AdminToken);

        result.Should().BeOfType<NoContentResult>();
        (await _db.Participants.FindAsync(part.Id)).Should().BeNull();
    }

    [Fact]
    public async Task SaveRestrictions_ReplacesPreviousRestrictions()
    {
        var room = new Room { Title = "Room", HostName = "Host", HostTelegramId = 1, Status = "collecting" };
        _db.Rooms.Add(room);
        var p1 = new Participant { RoomId = room.Id, FirstName = "P1", TelegramId = 1 };
        var p2 = new Participant { RoomId = room.Id, FirstName = "P2", TelegramId = 2 };
        var p3 = new Participant { RoomId = room.Id, FirstName = "P3", TelegramId = 3 };
        _db.Participants.AddRange(p1, p2, p3);

        var oldRest = new Restriction { RoomId = room.Id, GiverId = p1.Id, ReceiverId = p2.Id };
        _db.Restrictions.Add(oldRest);
        await _db.SaveChangesAsync();

        var req = new SaveRestrictionsRequest(
        [
            new RestrictionItem(p1.Id, p3.Id),
            new RestrictionItem(p2.Id, p3.Id)
        ]);

        var result = await _controller.SaveRestrictions(room.Id, room.AdminToken, req);

        result.Should().BeOfType<OkObjectResult>();
        var updated = await _db.Restrictions.Where(r => r.RoomId == room.Id).ToListAsync();
        updated.Should().HaveCount(2);
        updated.Should().NotContain(r => r.GiverId == p1.Id && r.ReceiverId == p2.Id);
    }

    [Fact]
    public async Task Shuffle_WithFewerThan3Participants_ReturnsBadRequest()
    {
        var room = new Room { Title = "Room", HostName = "Host", HostTelegramId = 1, Status = "collecting" };
        _db.Rooms.Add(room);
        _db.Participants.Add(new Participant { RoomId = room.Id, FirstName = "P1", TelegramId = 1 });
        _db.Participants.Add(new Participant { RoomId = room.Id, FirstName = "P2", TelegramId = 2 });
        await _db.SaveChangesAsync();

        var result = await _controller.Shuffle(room.Id, room.AdminToken);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Shuffle_WhenSuccessful_PersistsAssignmentsAndSendsNotifications()
    {
        var room = new Room { Title = "Room", HostName = "Host", HostTelegramId = 100, Status = "collecting" };
        _db.Rooms.Add(room);
        var p1 = new Participant { RoomId = room.Id, FirstName = "P1", TelegramId = 101 };
        var p2 = new Participant { RoomId = room.Id, FirstName = "P2", TelegramId = 102 };
        var p3 = new Participant { RoomId = room.Id, FirstName = "P3", TelegramId = 103 };
        _db.Participants.AddRange(p1, p2, p3);
        await _db.SaveChangesAsync();

        _mockAlgorithm.Setup(a => a.GeneratePairs(It.IsAny<List<Participant>>(), It.IsAny<List<Restriction>>()))
            .Returns(new ShuffleResult(true, [(p1, p2), (p2, p3), (p3, p1)]));

        _mockTelegramService.Setup(t => t.SendAssignmentNotificationAsync(
                room.Title,
                It.IsAny<Participant>(),
                It.IsAny<Participant>(),
                It.IsAny<string?>()))
            .ReturnsAsync(true);

        var result = await _controller.Shuffle(room.Id, room.AdminToken);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var resp = ok.Value.Should().BeOfType<ShuffleResponse>().Subject;
        resp.Success.Should().BeTrue();
        resp.TotalParticipants.Should().Be(3);
        resp.NotificationsSent.Should().Be(3);

        var updatedRoom = await _db.Rooms.FindAsync(room.Id);
        updatedRoom!.Status.Should().Be("shuffled");

        var assignments = await _db.Assignments.Where(a => a.RoomId == room.Id).ToListAsync();
        assignments.Should().HaveCount(3);
        assignments.All(a => a.NotificationSent).Should().BeTrue();
    }

    [Fact]
    public async Task GetMyAssignment_WhenShuffled_ReturnsCorrectRecipient()
    {
        var room = new Room { Title = "Christmas Party", HostName = "Host", HostTelegramId = 1, Status = "shuffled" };
        _db.Rooms.Add(room);
        var giver = new Participant { RoomId = room.Id, FirstName = "Giver", TelegramId = 555 };
        var receiver = new Participant { RoomId = room.Id, FirstName = "Receiver", LastName = "R", TelegramUsername = "receiver_tg", Wishlist = "Sweater" };
        _db.Participants.AddRange(giver, receiver);

        var assignment = new Assignment
        {
            RoomId = room.Id,
            GiverId = giver.Id,
            ReceiverId = receiver.Id,
            Receiver = receiver
        };
        _db.Assignments.Add(assignment);
        await _db.SaveChangesAsync();

        var result = await _controller.GetMyAssignment(room.Id, 555);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<MyAssignmentDto>().Subject;
        dto.RoomTitle.Should().Be("Christmas Party");
        dto.ReceiverFirstName.Should().Be("Receiver");
        dto.ReceiverUsername.Should().Be("receiver_tg");
        dto.ReceiverWishlist.Should().Be("Sweater");
    }

    [Fact]
    public async Task GetMyAssignment_WhenNotShuffled_ReturnsBadRequest()
    {
        var room = new Room { Title = "Room", HostName = "Host", HostTelegramId = 1, Status = "collecting" };
        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        var result = await _controller.GetMyAssignment(room.Id, 555);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }
}
