window.SecretSanta = window.SecretSanta || {};

(function (ns) {
    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function buildGraph(n, mode, restrictions) {
        return Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (_, j) =>
                i !== j && (mode === 'without' || !restrictions[i][j])
            )
        );
    }

    function analyzeDegrees(graph, participants) {
        const n = graph.length;
        const inDegrees = Array(n).fill(0);
        const outDegrees = Array(n).fill(0);

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (graph[i][j]) {
                    outDegrees[i]++;
                    inDegrees[j]++;
                }
            }
        }

        const noReceiver = [];
        const noGiver = [];

        for (let i = 0; i < n; i++) {
            if (inDegrees[i] === 0) noReceiver.push(participants[i]);
            if (outDegrees[i] === 0) noGiver.push(participants[i]);
        }

        return { noReceiver, noGiver };
    }

    function hamiltonianUtil(graph, path, visited, n) {
        if (path.length === n) {
            return graph[path[n - 1]][path[0]] ? [...path] : null;
        }

        const last = path[path.length - 1];
        const candidates = graph[last]
            .map((canGo, i) => (canGo && !visited[i] ? i : null))
            .filter(i => i !== null);

        shuffle(candidates);

        for (const v of candidates) {
            visited[v] = true;
            path.push(v);

            const res = hamiltonianUtil(graph, path, visited, n);
            if (res) return res;

            path.pop();
            visited[v] = false;
        }
        return null;
    }

    function findRandomHamiltonianCycle(graph, n) {
        const path = [0];
        const visited = Array(n).fill(false);
        visited[0] = true;
        return hamiltonianUtil(graph, path, visited, n);
    }

    function generateAssignment(participants, restrictions, mode) {
        const n = participants.length;
        if (n < 3) {
            return { ok: false, reason: 'min_participants' };
        }

        const graph = buildGraph(n, mode, restrictions);
        const { noReceiver, noGiver } = analyzeDegrees(graph, participants);

        if (noReceiver.length > 0 || noGiver.length > 0) {
            let message = 'Неможливо згенерувати жеребкування через обмеження:\n';
            if (noReceiver.length > 0) {
                message += `Залишаться без подарунків: ${noReceiver.join(', ')}.\n`;
            }
            if (noGiver.length > 0) {
                message += `Не дарують подарунок нікому: ${noGiver.join(', ')}`;
            }
            message += '\nЗмініть деякі обмеження.';
            return { ok: false, reason: 'impossible_degrees', message };
        }

        const path = findRandomHamiltonianCycle(graph, n);
        if (!path) {
            return {
                ok: false,
                reason: 'no_cycle',
                message:
                    'Неможливо знайти валідне жеребкування з поточними обмеженнями. Обмеження надто суворі — спробуйте послабити їх.',
            };
        }

        const rot = Math.floor(Math.random() * n);
        const rotatedPath = path.slice(rot).concat(path.slice(0, rot));

        const pairs = rotatedPath.map((giver, i) => ({
            giver: participants[giver],
            receiver: participants[rotatedPath[(i + 1) % n]],
        }));

        return { ok: true, pairs };
    }

    ns.algorithm = {
        shuffle,
        buildGraph,
        analyzeDegrees,
        findRandomHamiltonianCycle,
        generateAssignment,
    };
})(window.SecretSanta);
