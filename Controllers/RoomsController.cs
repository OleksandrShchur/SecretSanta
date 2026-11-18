using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecretSanta.Data;
using SecretSanta.DTOs;
using SecretSanta.Models;
using SecretSanta.Services;

namespace SecretSanta.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly SecretSantaDbContext _db;
    private readonly ISecretSantaAlgorithm _algorithm;
    private readonly ITelegramService _telegramService;
    private readonly IConfiguration _configuration;

    public RoomsController(
        SecretSantaDbContext db,
        ISecretSantaAlgorithm algorithm,
        ITelegramService telegramService,
        IConfiguration configuration)
    {
        _db = db;
        _algorithm = algorithm;
        _telegramService = telegramService;
        _configuration = configuration;
    }

    // 1. Створення нової кімнати хостом
    [HttpPost]
    public async Task<ActionResult<RoomAdminDto>> Create([FromBody] CreateRoomRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) ||
            string.IsNullOrWhiteSpace(request.HostFirstName) ||
            request.HostTelegramId == 0)
        {
            return BadRequest("Назва кімнати, ім'я хоста та Telegram ID є обов'язковими.");
        }

        string hostFullName = $"{request.HostFirstName.Trim()} {request.HostLastName?.Trim()}".Trim();

        var room = new Room
        {
            Title = request.Title.Trim(),
            HostName = hostFullName,
            HostTelegramId = request.HostTelegramId,
            HostUsername = request.HostUsername?.TrimStart('@'),
            Status = "collecting"
        };

        _db.Rooms.Add(room);

        if (request.HostParticipates)
        {
            var hostParticipant = new Participant
            {
                RoomId = room.Id,
                FirstName = request.HostFirstName.Trim(),
                LastName = request.HostLastName?.Trim() ?? string.Empty,
                TelegramId = request.HostTelegramId,
                TelegramUsername = request.HostUsername?.TrimStart('@'),
                Wishlist = request.HostWishlist?.Trim()
            };
            _db.Participants.Add(hostParticipant);
        }

        await _db.SaveChangesAsync();

        var participants = await _db.Participants
            .Where(p => p.RoomId == room.Id)
            .Select(p => new ParticipantDto(p.Id, p.RoomId, p.FirstName, p.LastName, p.TelegramId, p.TelegramUsername, p.Wishlist, p.CreatedAt))
            .ToListAsync();

        return CreatedAtAction(
            nameof(GetAdmin),
            new { id = room.Id, adminToken = room.AdminToken },
            new RoomAdminDto(
                room.Id,
                room.Title,
                room.HostName,
                room.HostTelegramId,
                room.HostUsername,
                room.AdminToken,
                room.Status,
                room.CreatedAt,
                participants,
                new List<RestrictionDto>()
            )
        );
    }

    // 1b. Список кімнат, створених користувачем (за Telegram ID)
    [HttpGet("my")]
    public async Task<ActionResult<List<RoomSummaryDto>>> GetMyRooms([FromQuery] long telegramId)
    {
        if (telegramId == 0)
        {
            return BadRequest("Telegram ID є обов'язковим.");
        }

        var rooms = await _db.Rooms
            .Where(r => r.HostTelegramId == telegramId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new RoomSummaryDto(
                r.Id,
                r.Title,
                r.Status,
                r.Participants.Count,
                r.CreatedAt,
                r.AdminToken
            ))
            .ToListAsync();

        return Ok(rooms);
    }

    // 1b2. Список кімнат, де користувач є учасником (або був учасником)
    [HttpGet("participating")]
    public async Task<ActionResult<List<RoomParticipationDto>>> GetParticipatingRooms([FromQuery] long telegramId)
    {
        if (telegramId == 0)
        {
            return BadRequest("Telegram ID є обов'язковим.");
        }

        var rooms = await _db.Rooms
            .Where(r => r.Participants.Any(p => p.TelegramId == telegramId))
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new RoomParticipationDto(
                r.Id,
                r.Title,
                r.HostName,
                r.Status,
                r.Participants.Count,
                r.CreatedAt
            ))
            .ToListAsync();

        return Ok(rooms);
    }

    // 1c. Деактивація кімнати (закриття для нових учасників)
    [HttpPatch("{id:guid}/deactivate")]
    public async Task<IActionResult> Deactivate(Guid id, [FromQuery] string adminToken)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null || room.AdminToken != adminToken)
        {
            return Unauthorized("Недійсний токен організатора або кімнату не знайдено.");
        }

        if (room.Status == "closed")
        {
            return BadRequest("Кімната вже деактивована.");
        }

        room.Status = "closed";
        await _db.SaveChangesAsync();

        return Ok(new { success = true, status = room.Status });
    }

    // 1d. Видалення кімнати (разом з усіма даними)
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteRoom(Guid id, [FromQuery] string adminToken)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null || room.AdminToken != adminToken)
        {
            return Unauthorized("Недійсний токен організатора або кімнату не знайдено.");
        }

        // Cascade delete видалить Participants, Restrictions, Assignments
        _db.Rooms.Remove(room);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // 2. Публічна інформація про кімнату (для сторінки приєднання)
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RoomPublicDto>> GetPublic(Guid id)
    {
        var room = await _db.Rooms
            .Include(r => r.Participants)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (room == null)
        {
            return NotFound("Кімнату не знайдено.");
        }

        return Ok(new RoomPublicDto(
            room.Id,
            room.Title,
            room.HostName,
            room.Status,
            room.Participants.Count,
            room.CreatedAt
        ));
    }

    // 3. Інформація для організатора (доступ за adminToken)
    [HttpGet("{id:guid}/admin")]
    public async Task<ActionResult<RoomAdminDto>> GetAdmin(Guid id, [FromQuery] string adminToken)
    {
        var room = await _db.Rooms
            .Include(r => r.Participants)
            .Include(r => r.Restrictions)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (room == null || room.AdminToken != adminToken)
        {
            return Unauthorized("Недійсний токен організатора або кімнату не знайдено.");
        }

        var participants = room.Participants
            .Select(p => new ParticipantDto(p.Id, p.RoomId, p.FirstName, p.LastName, p.TelegramId, p.TelegramUsername, p.Wishlist, p.CreatedAt))
            .ToList();

        var restrictions = room.Restrictions
            .Select(r => new RestrictionDto(r.Id, r.GiverId, r.ReceiverId))
            .ToList();

        return Ok(new RoomAdminDto(
            room.Id,
            room.Title,
            room.HostName,
            room.HostTelegramId,
            room.HostUsername,
            room.AdminToken,
            room.Status,
            room.CreatedAt,
            participants,
            restrictions
        ));
    }

    // 4. Додавання / оновлення учасника кімнати
    [HttpPost("{id:guid}/participants")]
    public async Task<ActionResult<ParticipantDto>> AddParticipant(Guid id, [FromBody] CreateParticipantRequest request)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null)
        {
            return NotFound("Кімнату не знайдено.");
        }

        if (room.Status != "collecting")
        {
            return BadRequest("Прийом заявок у цю кімнату вже закрито (жеребкування проведено).");
        }

        if (string.IsNullOrWhiteSpace(request.FirstName) || request.TelegramId == 0)
        {
            return BadRequest("Ім'я та Telegram ID є обов'язковими.");
        }

        var existing = await _db.Participants
            .FirstOrDefaultAsync(p => p.RoomId == id && p.TelegramId == request.TelegramId);

        if (existing != null)
        {
            existing.FirstName = request.FirstName.Trim();
            existing.LastName = request.LastName?.Trim() ?? string.Empty;
            existing.TelegramUsername = request.TelegramUsername?.TrimStart('@');
            if (!string.IsNullOrWhiteSpace(request.Wishlist))
            {
                existing.Wishlist = request.Wishlist.Trim();
            }
            await _db.SaveChangesAsync();

            return Ok(new ParticipantDto(
                existing.Id,
                existing.RoomId,
                existing.FirstName,
                existing.LastName,
                existing.TelegramId,
                existing.TelegramUsername,
                existing.Wishlist,
                existing.CreatedAt
            ));
        }

        var participant = new Participant
        {
            RoomId = id,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName?.Trim() ?? string.Empty,
            TelegramId = request.TelegramId,
            TelegramUsername = request.TelegramUsername?.TrimStart('@'),
            Wishlist = request.Wishlist?.Trim()
        };

        _db.Participants.Add(participant);
        await _db.SaveChangesAsync();

        return Ok(new ParticipantDto(
            participant.Id,
            participant.RoomId,
            participant.FirstName,
            participant.LastName,
            participant.TelegramId,
            participant.TelegramUsername,
            participant.Wishlist,
            participant.CreatedAt
        ));
    }

    // 5. Перегляд власного підопічного у Mini App
    [HttpGet("{id:guid}/my-assignment")]
    public async Task<ActionResult<MyAssignmentDto>> GetMyAssignment(Guid id, [FromQuery] long telegramId)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null)
        {
            return NotFound("Кімнату не знайдено.");
        }

        if (room.Status != "shuffled")
        {
            return BadRequest("Жеребкування для цієї кімнати ще не проведено.");
        }

        var giver = await _db.Participants
            .FirstOrDefaultAsync(p => p.RoomId == id && p.TelegramId == telegramId);

        if (giver == null)
        {
            return NotFound("Вас не знайдено серед учасників цієї кімнати.");
        }

        var assignment = await _db.Assignments
            .Include(a => a.Receiver)
            .FirstOrDefaultAsync(a => a.RoomId == id && a.GiverId == giver.Id);

        if (assignment == null || assignment.Receiver == null)
        {
            return NotFound("Призначення для вас не знайдено.");
        }

        return Ok(new MyAssignmentDto(
            room.Title,
            assignment.Receiver.FirstName,
            assignment.Receiver.LastName,
            assignment.Receiver.TelegramUsername,
            assignment.Receiver.Wishlist
        ));
    }

    // 6. Видалення учасника організатором
    [HttpDelete("{id:guid}/participants/{participantId:guid}")]
    public async Task<IActionResult> RemoveParticipant(Guid id, Guid participantId, [FromQuery] string adminToken)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null || room.AdminToken != adminToken)
        {
            return Unauthorized("Недійсний токен організатора.");
        }

        if (room.Status != "collecting")
        {
            return BadRequest("Неможливо видалити учасника після проведення жеребкування.");
        }

        var participant = await _db.Participants.FirstOrDefaultAsync(p => p.Id == participantId && p.RoomId == id);
        if (participant == null)
        {
            return NotFound("Учасника не знайдено.");
        }

        _db.Participants.Remove(participant);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // 7. Збереження обмежень
    [HttpPost("{id:guid}/restrictions")]
    public async Task<IActionResult> SaveRestrictions(Guid id, [FromQuery] string adminToken, [FromBody] SaveRestrictionsRequest request)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null || room.AdminToken != adminToken)
        {
            return Unauthorized("Недійсний токен організатора.");
        }

        if (room.Status != "collecting")
        {
            return BadRequest("Неможливо змінити обмеження після проведення жеребкування.");
        }

        var old = await _db.Restrictions.Where(r => r.RoomId == id).ToListAsync();
        _db.Restrictions.RemoveRange(old);

        var newRestrictions = request.Restrictions.Select(r => new Restriction
        {
            RoomId = id,
            GiverId = r.GiverId,
            ReceiverId = r.ReceiverId
        }).ToList();

        await _db.Restrictions.AddRangeAsync(newRestrictions);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, count = newRestrictions.Count });
    }

    // 8. Проведення жеребкування та розсилка Telegram-сповіщень
    [HttpPost("{id:guid}/shuffle")]
    public async Task<ActionResult<ShuffleResponse>> Shuffle(Guid id, [FromQuery] string adminToken)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null || room.AdminToken != adminToken)
        {
            return Unauthorized("Недійсний токен організатора.");
        }

        if (room.Status == "shuffled")
        {
            return BadRequest("Жеребкування для цієї кімнати вже було проведено!");
        }

        var participants = await _db.Participants.Where(p => p.RoomId == id).ToListAsync();
        if (participants.Count < 3)
        {
            return BadRequest("Для жеребкування потрібно щонайменше 3 учасники.");
        }

        var restrictions = await _db.Restrictions.Where(r => r.RoomId == id).ToListAsync();

        var result = _algorithm.GeneratePairs(participants, restrictions);
        if (!result.Success)
        {
            return BadRequest(result.ErrorMessage);
        }

        var oldAssignments = await _db.Assignments.Where(a => a.RoomId == id).ToListAsync();
        _db.Assignments.RemoveRange(oldAssignments);

        var assignments = result.Pairs.Select(pair => new Assignment
        {
            RoomId = id,
            GiverId = pair.Giver.Id,
            ReceiverId = pair.Receiver.Id,
            NotificationSent = false
        }).ToList();

        await _db.Assignments.AddRangeAsync(assignments);
        room.Status = "shuffled";
        await _db.SaveChangesAsync();

        string? webAppUrl = _configuration["Telegram:WebAppUrl"]
            ?? Environment.GetEnvironmentVariable("TELEGRAM_WEBAPP_URL")
            ?? Environment.GetEnvironmentVariable("WEBAPP_URL");

        int notificationsSent = 0;
        foreach (var (giver, receiver) in result.Pairs)
        {
            string? userWebAppUrl = null;
            if (!string.IsNullOrWhiteSpace(webAppUrl))
            {
                string baseUrl = webAppUrl.TrimEnd('/');
                string sep = baseUrl.Contains('?') ? "&" : "?";
                bool isHost = giver.TelegramId == room.HostTelegramId;
                userWebAppUrl = (isHost && !string.IsNullOrWhiteSpace(room.AdminToken))
                    ? $"{baseUrl}{sep}room={room.Id}&admin={Uri.EscapeDataString(room.AdminToken)}"
                    : $"{baseUrl}{sep}room={room.Id}";
            }

            bool ok = await _telegramService.SendAssignmentNotificationAsync(room.Title, giver, receiver, userWebAppUrl);
            if (ok)
            {
                notificationsSent++;
                var assign = assignments.First(a => a.GiverId == giver.Id);
                assign.NotificationSent = true;
            }
            await Task.Delay(100);
        }

        await _db.SaveChangesAsync();

        string? note = null;
        if (notificationsSent < participants.Count)
        {
            note = $"Надіслано {notificationsSent} з {participants.Count} сповіщень. Переконайтеся, що всі учасники хоча б раз запустили бота.";
        }

        return Ok(new ShuffleResponse(true, participants.Count, notificationsSent, note));
    }
}
