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
    private readonly IEmailService _emailService;
    private readonly ILogger<RoomsController> _logger;

    public RoomsController(
        SecretSantaDbContext db,
        ISecretSantaAlgorithm algorithm,
        IEmailService emailService,
        ILogger<RoomsController> logger)
    {
        _db = db;
        _algorithm = algorithm;
        _emailService = emailService;
        _logger = logger;
    }

    // 1. Створення кімнати
    [HttpPost]
    public async Task<ActionResult<RoomAdminDto>> CreateRoom([FromBody] CreateRoomRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) ||
            string.IsNullOrWhiteSpace(request.HostFirstName) ||
            string.IsNullOrWhiteSpace(request.HostEmail))
        {
            return BadRequest("Назва кімнати, ім'я та email організатора є обов'язковими.");
        }

        string hostFullName = $"{request.HostFirstName.Trim()} {request.HostLastName?.Trim()}".Trim();

        var room = new Room
        {
            Title = request.Title.Trim(),
            HostName = hostFullName,
            HostEmail = request.HostEmail.Trim().ToLowerInvariant(),
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
                Email = request.HostEmail.Trim().ToLowerInvariant(),
                Wishlist = request.HostWishlist?.Trim()
            };
            _db.Participants.Add(hostParticipant);
        }

        await _db.SaveChangesAsync();

        var participants = await _db.Participants
            .Where(p => p.RoomId == room.Id)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new ParticipantDto(p.Id, p.RoomId, p.FirstName, p.LastName, p.Email, p.Wishlist, p.CreatedAt))
            .ToListAsync();

        return Ok(new RoomAdminDto(
            room.Id,
            room.Title,
            room.HostName,
            room.HostEmail,
            room.AdminToken,
            room.Status,
            room.CreatedAt,
            participants,
            []
        ));
    }

    // 2. Отримання публічної інформації про кімнату (для сторінки приєднання)
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RoomPublicDto>> GetRoom(Guid id)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null)
        {
            return NotFound("Кімнату не знайдено.");
        }

        return Ok(new RoomPublicDto(
            room.Id,
            room.Title,
            room.HostName,
            room.Status,
            room.CreatedAt
        ));
    }

    // 3. Отримання панелі хоста (з перевіркою адмін-токена)
    [HttpGet("{id:guid}/admin")]
    public async Task<ActionResult<RoomAdminDto>> GetRoomAdmin(Guid id, [FromQuery] string adminToken)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null)
        {
            return NotFound("Кімнату не знайдено.");
        }

        if (room.AdminToken != adminToken)
        {
            return Unauthorized("Недійсний токен організатора.");
        }

        var participants = await _db.Participants
            .Where(p => p.RoomId == id)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new ParticipantDto(p.Id, p.RoomId, p.FirstName, p.LastName, p.Email, p.Wishlist, p.CreatedAt))
            .ToListAsync();

        var restrictions = await _db.Restrictions
            .Where(r => r.RoomId == id)
            .Select(r => new RestrictionDto(r.Id, r.GiverId, r.ReceiverId))
            .ToListAsync();

        return Ok(new RoomAdminDto(
            room.Id,
            room.Title,
            room.HostName,
            room.HostEmail,
            room.AdminToken,
            room.Status,
            room.CreatedAt,
            participants,
            restrictions
        ));
    }

    // 4. Отримання списку учасників кімнати
    [HttpGet("{id:guid}/participants")]
    public async Task<ActionResult<List<ParticipantDto>>> GetParticipants(Guid id)
    {
        var participants = await _db.Participants
            .Where(p => p.RoomId == id)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new ParticipantDto(p.Id, p.RoomId, p.FirstName, p.LastName, p.Email, p.Wishlist, p.CreatedAt))
            .ToListAsync();

        return Ok(participants);
    }

    // 5. Реєстрація учасника
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
            return BadRequest("Реєстрацію в цю кімнату вже завершено.");
        }

        if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest("Ім'я та email є обов'язковими.");
        }

        string emailClean = request.Email.Trim().ToLowerInvariant();
        bool exists = await _db.Participants.AnyAsync(p => p.RoomId == id && p.Email == emailClean);
        if (exists)
        {
            return Conflict("Учасник з таким email вже зареєстрований у цій кімнаті!");
        }

        var participant = new Participant
        {
            RoomId = id,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName?.Trim() ?? string.Empty,
            Email = emailClean,
            Wishlist = request.Wishlist?.Trim()
        };

        _db.Participants.Add(participant);
        await _db.SaveChangesAsync();

        return Ok(new ParticipantDto(
            participant.Id,
            participant.RoomId,
            participant.FirstName,
            participant.LastName,
            participant.Email,
            participant.Wishlist,
            participant.CreatedAt
        ));
    }

    // 6. Видалення учасника хостом
    [HttpDelete("{id:guid}/participants/{participantId:guid}")]
    public async Task<IActionResult> RemoveParticipant(Guid id, Guid participantId, [FromQuery] string adminToken)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null || room.AdminToken != adminToken)
        {
            return Unauthorized("Недійсний токен організатора.");
        }

        if (room.Status == "shuffled")
        {
            return BadRequest("Неможливо видалити учасника після проведення жеребкування.");
        }

        var participant = await _db.Participants.FirstOrDefaultAsync(p => p.Id == participantId && p.RoomId == id);
        if (participant == null)
        {
            return NotFound("Учасника не знайдено.");
        }

        // Видаляємо пов'язані обмеження
        var restrictions = await _db.Restrictions
            .Where(r => r.RoomId == id && (r.GiverId == participantId || r.ReceiverId == participantId))
            .ToListAsync();
        _db.Restrictions.RemoveRange(restrictions);

        _db.Participants.Remove(participant);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // 7. Збереження обмежень хостом
    [HttpPost("{id:guid}/restrictions")]
    public async Task<IActionResult> SaveRestrictions(Guid id, [FromQuery] string adminToken, [FromBody] SaveRestrictionsRequest request)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null || room.AdminToken != adminToken)
        {
            return Unauthorized("Недійсний токен організатора.");
        }

        if (room.Status == "shuffled")
        {
            return BadRequest("Неможливо змінити обмеження після проведення жеребкування.");
        }

        // Очищаємо старі обмеження кімнати
        var old = await _db.Restrictions.Where(r => r.RoomId == id).ToListAsync();
        _db.Restrictions.RemoveRange(old);

        if (request.Restrictions.Count > 0)
        {
            var newRestrictions = request.Restrictions.Select(r => new Restriction
            {
                RoomId = id,
                GiverId = r.GiverId,
                ReceiverId = r.ReceiverId
            });
            await _db.Restrictions.AddRangeAsync(newRestrictions);
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // 8. Відправка запрошень на Email
    [HttpPost("{id:guid}/invites")]
    public async Task<IActionResult> SendInvites(Guid id, [FromQuery] string adminToken, [FromBody] SendInvitesRequest request)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null || room.AdminToken != adminToken)
        {
            return Unauthorized("Недійсний токен організатора.");
        }

        int sent = 0;
        foreach (var email in request.Emails)
        {
            string clean = email.Trim();
            if (string.IsNullOrWhiteSpace(clean)) continue;

            bool ok = await _emailService.SendInviteEmailAsync(room.Title, room.HostName, clean, request.InviteUrl);
            if (ok) sent++;
        }

        return Ok(new { success = true, sentCount = sent });
    }

    // 9. Проведення жеребкування та розсилка листів
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

        // Зберігаємо пари в БД
        var oldAssignments = await _db.Assignments.Where(a => a.RoomId == id).ToListAsync();
        _db.Assignments.RemoveRange(oldAssignments);

        var assignments = result.Pairs.Select(pair => new Assignment
        {
            RoomId = id,
            GiverId = pair.Giver.Id,
            ReceiverId = pair.Receiver.Id,
            EmailSent = false
        }).ToList();

        await _db.Assignments.AddRangeAsync(assignments);
        room.Status = "shuffled";
        await _db.SaveChangesAsync();

        // Розсилаємо персональні листи через IEmailService
        int emailsSent = 0;
        foreach (var (giver, receiver) in result.Pairs)
        {
            bool ok = await _emailService.SendAssignmentEmailAsync(room.Title, giver, receiver);
            if (ok)
            {
                emailsSent++;
                var assign = assignments.First(a => a.GiverId == giver.Id);
                assign.EmailSent = true;
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new ShuffleResponse(true, participants.Count, emailsSent));
    }
}
