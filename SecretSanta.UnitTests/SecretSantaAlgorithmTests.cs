using FluentAssertions;
using SecretSanta.Models;
using SecretSanta.Services;
using Xunit;

namespace SecretSanta.UnitTests;

public class SecretSantaAlgorithmTests
{
    private readonly SecretSantaAlgorithm _algorithm = new();

    private static List<Participant> CreateParticipants(int count)
    {
        return Enumerable.Range(1, count)
            .Select(i => new Participant
            {
                Id = Guid.NewGuid(),
                FirstName = $"User{i}",
                LastName = $"Last{i}",
                TelegramId = 1000 + i,
                TelegramUsername = $"user_{i}"
            })
            .ToList();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(2)]
    public void GeneratePairs_LessThan3Participants_ReturnsFailure(int count)
    {
        // Arrange
        var participants = CreateParticipants(count);
        var restrictions = new List<Restriction>();

        // Act
        var result = _algorithm.GeneratePairs(participants, restrictions);

        // Assert
        result.Success.Should().BeFalse();
        result.Pairs.Should().BeEmpty();
        result.ErrorMessage.Should().Contain("щонайменше 3");
    }

    [Theory]
    [InlineData(3)]
    [InlineData(4)]
    [InlineData(5)]
    [InlineData(10)]
    [InlineData(25)]
    public void GeneratePairs_WithoutRestrictions_ProducesValidHamiltonianCycle(int count)
    {
        // Arrange
        var participants = CreateParticipants(count);
        var restrictions = new List<Restriction>();

        // Act
        var result = _algorithm.GeneratePairs(participants, restrictions);

        // Assert
        result.Success.Should().BeTrue();
        result.Pairs.Should().HaveCount(count);
        result.ErrorMessage.Should().BeNull();

        // Every participant is a giver exactly once
        var givers = result.Pairs.Select(p => p.Giver.Id).ToList();
        givers.Should().OnlyHaveUniqueItems();
        givers.Should().BeEquivalentTo(participants.Select(p => p.Id));

        // Every participant is a receiver exactly once
        var receivers = result.Pairs.Select(p => p.Receiver.Id).ToList();
        receivers.Should().OnlyHaveUniqueItems();
        receivers.Should().BeEquivalentTo(participants.Select(p => p.Id));

        // Nobody gives to themselves
        foreach (var (giver, receiver) in result.Pairs)
        {
            giver.Id.Should().NotBe(receiver.Id);
        }

        // Must form a single connected cycle
        var mapping = result.Pairs.ToDictionary(p => p.Giver.Id, p => p.Receiver.Id);
        var visited = new HashSet<Guid>();
        var current = participants[0].Id;

        for (int i = 0; i < count; i++)
        {
            visited.Add(current);
            current = mapping[current];
        }

        visited.Should().HaveCount(count);
        current.Should().Be(participants[0].Id, "Cycle must close back to the starting participant");
    }

    [Fact]
    public void GeneratePairs_WithRestrictions_NeverPairsRestrictedGiverAndReceiver()
    {
        // Arrange: 4 participants, Participant 1 cannot give to Participant 2
        var participants = CreateParticipants(4);
        var restrictions = new List<Restriction>
        {
            new()
            {
                Id = Guid.NewGuid(),
                GiverId = participants[0].Id,
                ReceiverId = participants[1].Id
            }
        };

        // Act: Run multiple times to ensure the constraint holds consistently
        for (int run = 0; run < 20; run++)
        {
            var result = _algorithm.GeneratePairs(participants, restrictions);

            // Assert
            result.Success.Should().BeTrue();
            result.Pairs.Should().NotContain(p =>
                p.Giver.Id == participants[0].Id && p.Receiver.Id == participants[1].Id);
        }
    }

    [Fact]
    public void GeneratePairs_WithReciprocalRestrictions_RespectsBothDirections()
    {
        // Arrange: Couple cannot give to each other
        var participants = CreateParticipants(4);
        var p1 = participants[0];
        var p2 = participants[1];

        var restrictions = new List<Restriction>
        {
            new() { Id = Guid.NewGuid(), GiverId = p1.Id, ReceiverId = p2.Id },
            new() { Id = Guid.NewGuid(), GiverId = p2.Id, ReceiverId = p1.Id }
        };

        // Act
        for (int i = 0; i < 20; i++)
        {
            var result = _algorithm.GeneratePairs(participants, restrictions);

            result.Success.Should().BeTrue();
            result.Pairs.Should().NotContain(p => p.Giver.Id == p1.Id && p.Receiver.Id == p2.Id);
            result.Pairs.Should().NotContain(p => p.Giver.Id == p2.Id && p.Receiver.Id == p1.Id);
        }
    }

    [Fact]
    public void GeneratePairs_WhenParticipantHasNoPossibleReceivers_ReturnsHelpfulErrorMessage()
    {
        // Arrange: 3 participants, P1 restricted from giving to both P2 and P3
        var participants = CreateParticipants(3);
        var restrictions = new List<Restriction>
        {
            new() { Id = Guid.NewGuid(), GiverId = participants[0].Id, ReceiverId = participants[1].Id },
            new() { Id = Guid.NewGuid(), GiverId = participants[0].Id, ReceiverId = participants[2].Id }
        };

        // Act
        var result = _algorithm.GeneratePairs(participants, restrictions);

        // Assert
        result.Success.Should().BeFalse();
        result.Pairs.Should().BeEmpty();
        result.ErrorMessage.Should().Contain("Не дарують подарунок нікому");
        result.ErrorMessage.Should().Contain(participants[0].FirstName);
    }

    [Fact]
    public void GeneratePairs_WhenParticipantHasNoPossibleGivers_ReturnsHelpfulErrorMessage()
    {
        // Arrange: 3 participants, both P2 and P3 restricted from giving to P1
        var participants = CreateParticipants(3);
        var restrictions = new List<Restriction>
        {
            new() { Id = Guid.NewGuid(), GiverId = participants[1].Id, ReceiverId = participants[0].Id },
            new() { Id = Guid.NewGuid(), GiverId = participants[2].Id, ReceiverId = participants[0].Id }
        };

        // Act
        var result = _algorithm.GeneratePairs(participants, restrictions);

        // Assert
        result.Success.Should().BeFalse();
        result.Pairs.Should().BeEmpty();
        result.ErrorMessage.Should().Contain("Залишаться без подарунків");
        result.ErrorMessage.Should().Contain(participants[0].FirstName);
    }

    [Fact]
    public void GeneratePairs_WhenCycleIsImpossibleDueToPartition_ReturnsCycleFailureMessage()
    {
        // Arrange: 4 participants, but P1 and P2 can only give to each other (not to P3/P4), and vice versa
        // This splits the graph into two 2-cycles, making a 4-node Hamiltonian cycle impossible
        var participants = CreateParticipants(4);
        var restrictions = new List<Restriction>
        {
            // P1 cannot give to P3 or P4
            new() { Id = Guid.NewGuid(), GiverId = participants[0].Id, ReceiverId = participants[2].Id },
            new() { Id = Guid.NewGuid(), GiverId = participants[0].Id, ReceiverId = participants[3].Id },
            // P2 cannot give to P3 or P4
            new() { Id = Guid.NewGuid(), GiverId = participants[1].Id, ReceiverId = participants[2].Id },
            new() { Id = Guid.NewGuid(), GiverId = participants[1].Id, ReceiverId = participants[3].Id },
        };

        // Act
        var result = _algorithm.GeneratePairs(participants, restrictions);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Contain("замкнений цикл");
    }

    [Fact]
    public void GeneratePairs_ProducesVaryingPermutationsAcrossMultipleRuns()
    {
        // Arrange
        var participants = CreateParticipants(6);
        var restrictions = new List<Restriction>();

        // Act: Generate 15 shuffles
        var generatedSignatures = new HashSet<string>();
        for (int i = 0; i < 15; i++)
        {
            var result = _algorithm.GeneratePairs(participants, restrictions);
            result.Success.Should().BeTrue();

            string sig = string.Join(";", result.Pairs.OrderBy(p => p.Giver.Id).Select(p => $"{p.Giver.Id}->{p.Receiver.Id}"));
            generatedSignatures.Add(sig);
        }

        // Assert: With 6 participants, there are (6-1)! = 120 possible cycles, so 15 runs should yield multiple distinct ones
        generatedSignatures.Count.Should().BeGreaterThan(1, "Shuffle should be randomized across runs");
    }
}
