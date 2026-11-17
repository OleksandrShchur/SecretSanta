using SecretSanta.Models;

namespace SecretSanta.Services;

public class SecretSantaAlgorithm : ISecretSantaAlgorithm
{
    public ShuffleResult GeneratePairs(List<Participant> participants, List<Restriction> restrictions)
    {
        int n = participants.Count;
        if (n < 3)
        {
            return new ShuffleResult(false, [], "Для жеребкування потрібно щонайменше 3 учасники.");
        }

        var restrictedSet = restrictions
            .Select(r => $"{r.GiverId}->{r.ReceiverId}")
            .ToHashSet();

        // Будуємо граф: graph[i][j] == true означає, що participant[i] може дарувати participant[j]
        bool[][] graph = new bool[n][];
        for (int i = 0; i < n; i++)
        {
            graph[i] = new bool[n];
            for (int j = 0; j < n; j++)
            {
                if (i == j)
                {
                    graph[i][j] = false;
                }
                else
                {
                    string key = $"{participants[i].Id}->{participants[j].Id}";
                    graph[i][j] = !restrictedSet.Contains(key);
                }
            }
        }

        // Перевірка ступенів вершин
        var inDegrees = new int[n];
        var outDegrees = new int[n];
        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < n; j++)
            {
                if (graph[i][j])
                {
                    outDegrees[i]++;
                    inDegrees[j]++;
                }
            }
        }

        var noReceiver = new List<string>();
        var noGiver = new List<string>();
        for (int i = 0; i < n; i++)
        {
            if (inDegrees[i] == 0) noReceiver.Add($"{participants[i].FirstName} {participants[i].LastName}");
            if (outDegrees[i] == 0) noGiver.Add($"{participants[i].FirstName} {participants[i].LastName}");
        }

        if (noReceiver.Count > 0 || noGiver.Count > 0)
        {
            string msg = "Неможливо згенерувати жеребкування через задані обмеження:\n";
            if (noReceiver.Count > 0) msg += $"Залишаться без подарунків: {string.Join(", ", noReceiver)}.\n";
            if (noGiver.Count > 0) msg += $"Не дарують подарунок нікому: {string.Join(", ", noGiver)}.\n";
            msg += "Змініть або видаліть деякі обмеження.";
            return new ShuffleResult(false, [], msg);
        }

        // Пошук випадкового гамільтонового циклу
        var cycle = FindRandomHamiltonianCycle(graph, n);
        if (cycle == null)
        {
            return new ShuffleResult(false, [], "Неможливо знайти дійсний замкнений цикл жеребкування. Спробуйте послабити обмеження для деяких учасників.");
        }

        var pairs = new List<(Participant Giver, Participant Receiver)>();
        for (int i = 0; i < cycle.Count; i++)
        {
            var giver = participants[cycle[i]];
            var receiver = participants[cycle[(i + 1) % cycle.Count]];
            pairs.Add((giver, receiver));
        }

        return new ShuffleResult(true, pairs);
    }

    private static List<int>? FindRandomHamiltonianCycle(bool[][] graph, int n)
    {
        var visited = new bool[n];
        var path = new List<int> { 0 };
        visited[0] = true;

        if (Dfs(graph, path, visited, n, out var result))
        {
            return result;
        }

        return null;
    }

    private static bool Dfs(bool[][] graph, List<int> path, bool[] visited, int n, out List<int>? result)
    {
        if (path.Count == n)
        {
            if (graph[path[n - 1]][path[0]])
            {
                result = [.. path];
                return true;
            }
            result = null;
            return false;
        }

        int last = path[^1];
        var candidates = new List<int>();
        for (int i = 0; i < n; i++)
        {
            if (graph[last][i] && !visited[i])
            {
                candidates.Add(i);
            }
        }

        // Випадкове перемішування кандидатів
        Shuffle(candidates);

        foreach (int v in candidates)
        {
            visited[v] = true;
            path.Add(v);

            if (Dfs(graph, path, visited, n, out result))
            {
                return true;
            }

            path.RemoveAt(path.Count - 1);
            visited[v] = false;
        }

        result = null;
        return false;
    }

    private static void Shuffle<T>(List<T> list)
    {
        var rng = Random.Shared;
        for (int i = list.Count - 1; i > 0; i--)
        {
            int j = rng.Next(i + 1);
            (list[i], list[j]) = (list[j], list[i]);
        }
    }
}
