let participants = [];
let restrictions = [];

const nameInput = document.getElementById('name-input');
const participantsUl = document.getElementById('participants-ul');
const restrictionsDiv = document.getElementById('restrictions-div');
const resultsUl = document.getElementById('results-ul');

const restrictionsSection = document.getElementById('restrictions-section');
const modeSection = document.getElementById('mode-section');
const generateSection = document.getElementById('generate-section');
const resultsSection = document.getElementById('results-section');

document.getElementById('add-btn').onclick = addParticipant;
document.getElementById('generate-btn').onclick = generateAssignment;
document.getElementById('regen-btn').onclick = generateAssignment;
document.getElementById('reset-btn').onclick = resetAll;

const popupOverlay = document.getElementById('popup-overlay');
const popupMessage = document.getElementById('popup-message');
const popupClose = document.getElementById('popup-close');

popupClose.onclick = () => popupOverlay.style.display = 'none';

function showPopup(message) {
    popupMessage.textContent = message;
    popupOverlay.style.display = 'flex';
}

document.querySelectorAll('input[name="mode"]').forEach(r =>
    r.onchange = updateMode
);

nameInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') addParticipant();
});

function addParticipant() {
    const name = nameInput.value.trim();
    if (!name || participants.includes(name)) 
    {
        showPopup('Учасник з таким імʼям вже існує');
        return;
    }

    const n = participants.length;
    participants.push(name);
    restrictions.push(new Array(n + 1).fill(false));
    restrictions.forEach(r => r.length < n + 1 && r.push(false));

    nameInput.value = '';
    updateParticipantsList();
    updateRestrictionsUI();
    checkMinParticipants();
}

function removeParticipant(index) {
    participants.splice(index, 1);
    restrictions.splice(index, 1);
    restrictions.forEach(r => r.splice(index, 1));

    updateParticipantsList();
    updateRestrictionsUI();
    checkMinParticipants();
}

function updateParticipantsList() {
    participantsUl.innerHTML = '';
    participants.forEach((name, i) => {
        const li = document.createElement('li');
        li.textContent = name;

        const btn = document.createElement('button');
        btn.textContent = 'Видалити';
        btn.onclick = () => removeParticipant(i);

        li.appendChild(btn);
        participantsUl.appendChild(li);
    });
}

function updateRestrictionsUI() {
    restrictionsDiv.innerHTML = '';
    if (participants.length < 2) return;

    participants.forEach((name, i) => {
        const p = document.createElement('p');
        p.textContent = `${name} не може дарувати:`;

        const block = document.createElement('div');

        participants.forEach((other, j) => {
            if (i === j) return;

            const label = document.createElement('label');
            const cb = document.createElement('input');

            cb.type = 'checkbox';
            cb.checked = restrictions[i][j];
            cb.onchange = () => {
                restrictions[i][j] = cb.checked;
                if (cb.checked) restrictions[j][i] = true;
                updateRestrictionsUI();
            };

            label.appendChild(cb);
            label.append(` ${other}`);
            block.appendChild(label);
        });

        p.appendChild(block);
        restrictionsDiv.appendChild(p);
    });
}

function updateMode() {
    const mode = document.querySelector('input[name="mode"]:checked')?.value;

    restrictionsSection.style.display =
        mode === 'with' && participants.length >= 2
            ? 'block'
            : 'none';
}

function checkMinParticipants() {
    const count = participants.length;

    modeSection.style.display = count >= 2 ? 'block' : 'none';
    generateSection.style.display = count >= 3 ? 'block' : 'none';

    if (count < 3) {
        resultsSection.style.display = 'none';
    }

    updateMode();
}

function generateAssignment() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const n = participants.length;

    if (n < 3) return;

    const graph = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) =>
            i !== j && (mode === 'without' || !restrictions[i][j])
        )
    );

    const path = findRandomHamiltonianCycle(graph, n);
    if (!path) return;

    resultsUl.innerHTML = '';
    path.forEach((giver, i) => {
        const receiver = path[(i + 1) % n];
        const li = document.createElement('li');
        li.textContent = `${participants[giver]} → дарує подарунок → ${participants[receiver]}`;
        resultsUl.appendChild(li);
    });

    resultsSection.style.display = 'block';
}

function resetAll() {
    participants = [];
    restrictions = [];
    participantsUl.innerHTML = '';
    restrictionsDiv.innerHTML = '';
    resultsUl.innerHTML = '';
    resultsSection.style.display = 'none';
    checkMinParticipants();
}

function findRandomHamiltonianCycle(graph, n) {
    const path = [0];
    const visited = Array(n).fill(false);
    visited[0] = true;
    return hamiltonianUtil(graph, path, visited, n);
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

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
