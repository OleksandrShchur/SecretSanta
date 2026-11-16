namespace SecretSanta.DTOs;

public record CreateRoomRequest(
    string Title,
    string HostFirstName,
    string HostLastName,
    string HostEmail,
    bool HostParticipates,
    string? HostWishlist
);

public record RoomPublicDto(
    Guid Id,
    string Title,
    string HostName,
    string Status,
    DateTime CreatedAt
);

public record ParticipantDto(
    Guid Id,
    Guid RoomId,
    string FirstName,
    string LastName,
    string Email,
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
    string HostEmail,
    string AdminToken,
    string Status,
    DateTime CreatedAt,
    List<ParticipantDto> Participants,
    List<RestrictionDto> Restrictions
);

public record CreateParticipantRequest(
    string FirstName,
    string LastName,
    string Email,
    string? Wishlist
);

public record RestrictionItem(Guid GiverId, Guid ReceiverId);

public record SaveRestrictionsRequest(List<RestrictionItem> Restrictions);

public record SendInvitesRequest(List<string> Emails, string InviteUrl);

public record ShuffleResponse(
    bool Success,
    int TotalParticipants,
    int EmailsSent,
    string? ErrorMessage = null
);
