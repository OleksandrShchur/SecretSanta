using SecretSanta.Models;

namespace SecretSanta.Services;

public record ShuffleResult(
    bool Success,
    List<(Participant Giver, Participant Receiver)> Pairs,
    string? ErrorMessage = null
);

public interface ISecretSantaAlgorithm
{
    ShuffleResult GeneratePairs(List<Participant> participants, List<Restriction> restrictions);
}
