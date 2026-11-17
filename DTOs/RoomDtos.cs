namespace SecretSanta.DTOs;

public record CreateRoomRequest(
    string Title,
    string HostFirstName,
    string? HostLastName,
    long HostTelegramId,
    string? HostUsername,
    bool HostParticipates,
    string? HostWishlist
);

public record RoomPublicDto(
    Guid Id,
    string Title,
    string HostName,
    string Status,
    int ParticipantCount,
    DateTime CreatedAt
);

public record ParticipantDto(
    Guid Id,
    Guid RoomId,
    string FirstName,
    string LastName,
    long TelegramId,
    string? TelegramUsername,
    string? Wishlist,
    DateTime CreatedAt
);

public record RestrictionDto(
    Guid Id,
    Guid GiverId,
    Guid ReceiverId
);

public record RoomAdminDto(
    Guid Id,
    string Title,
    string HostName,
    long HostTelegramId,
    string? HostUsername,
    string AdminToken,
    string Status,
    DateTime CreatedAt,
    List<ParticipantDto> Participants,
    List<RestrictionDto> Restrictions
);

public record CreateParticipantRequest(
    string FirstName,
    string? LastName,
    long TelegramId,
    string? TelegramUsername,
    string? Wishlist
);

public record RestrictionItem(Guid GiverId, Guid ReceiverId);

public record SaveRestrictionsRequest(List<RestrictionItem> Restrictions);

public record MyAssignmentDto(
    string RoomTitle,
    string ReceiverFirstName,
    string ReceiverLastName,
    string? ReceiverUsername,
    string? ReceiverWishlist
);

public record ShuffleResponse(
    bool Success,
    int TotalParticipants,
    int NotificationsSent,
    string? ErrorMessage = null
);

public record TelegramConfigDto(
    string BotUsername,
    bool Configured,
    string AppShortName = "app"
);
