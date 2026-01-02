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
    // Додаємо <br> для перенесення рядків
    popupMessage.innerHTML = message.replace(/\n/g, '<br>');
    popupOverlay.style.display = 'flex';
}

document.querySelectorAll('input[name="mode"]').forEach(r =>
    r.onchange = updateMode
);

nameInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') addParticipant();
});

// === ФУНКЦІЇ ЗБЕРЕЖЕННЯ/ЗАВАНТАЖЕННЯ ===
function saveToStorage() {
    localStorage.setItem('secretSantaParticipants', JSON.stringify(participants));
    localStorage.setItem('secretSantaRestrictions', JSON.stringify(restrictions));
    const mode = document.querySelector('input[name="mode"]:checked')?.value || 'without';
    localStorage.setItem('secretSantaMode', mode);
}

function loadFromStorage() {
    const savedParticipants = localStorage.getItem('secretSantaParticipants');
    if (savedParticipants) {
        participants = JSON.parse(savedParticipants);

        const savedRestrictions = localStorage.getItem('secretSantaRestrictions');
        if (savedRestrictions) {
            restrictions = JSON.parse(savedRestrictions);
        } else {
            const n = participants.length;
            restrictions = Array.from({length: n}, () => Array(n).fill(false));
        }

        // Перевірка розміру матриці на всяк випадок
        const n = participants.length;
        if (restrictions.length !== n || restrictions.some(row => row.length !== n)) {
            restrictions = Array.from({length: n}, () => Array(n).fill(false));
        }
    }
}

// === ОСНОВНІ ФУНКЦІЇ ===
function addParticipant() {
    const name = nameInput.value.trim();

    if (!name) {
        showPopup('Імʼя учасника не може бути порожнім!');
        return;
    }

    if (participants.includes(name)) 
    {
        showPopup('Учасник з таким імʼям вже існує!');
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
    saveToStorage(); // Зберігаємо
}

function removeParticipant(index) {
    participants.splice(index, 1);
    restrictions.splice(index, 1);
    restrictions.forEach(r => r.splice(index, 1));

    updateParticipantsList();
    updateRestrictionsUI();
    checkMinParticipants();
    saveToStorage(); // Зберігаємо
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
                saveToStorage(); // Зберігаємо після зміни
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
    const mode = document.querySelector('input[name="mode"]:checked')?.value || 'without';

    const showRestrictions = mode === 'with' && participants.length >= 2;
    restrictionsSection.style.display = showRestrictions ? 'block' : 'none';

    if (showRestrictions) {
        updateRestrictionsUI(); // Оновлюємо при показі
    }

    saveToStorage(); // Зберігаємо вибраний режим
}

function checkMinParticipants() {
    const count = participants.length;

    modeSection.style.display = count >= 3 ? 'block' : 'none';
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

    // === Перевірка неможливих ситуацій ===
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

    if (noReceiver.length > 0 || noGiver.length > 0) {
        let msg = 'Неможливо згенерувати жеребкування через обмеження:\n';
        if (noReceiver.length > 0) {
            const names = noReceiver.join(', ');
            msg += `Залишаться без подарунків: ${names}.\n`;
        }
        if (noGiver.length > 0) {
            const names = noGiver.join(', ');
            msg += `Не дарують подарунок нікому: ${names}`;
        }
        msg += '\nЗмініть деякі обмеження.';
        showPopup(msg);
        return;
    }
    // === КІНЕЦЬ ПЕРЕВІРКИ ===

    const path = findRandomHamiltonianCycle(graph, n);
    if (!path) {
        showPopup('Неможливо знайти валідне жеребкування з поточними обмеженнями. Обмеження надто суворі — спробуйте послабити їх.');
        return;
    }

    const rot = Math.floor(Math.random() * n);
    const rotatedPath = path.slice(rot).concat(path.slice(0, rot));

    resultsUl.innerHTML = '';
    rotatedPath.forEach((giver, i) => {
        const receiver = rotatedPath[(i + 1) % n];
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

    localStorage.removeItem('secretSantaParticipants');
    localStorage.removeItem('secretSantaRestrictions');
    localStorage.removeItem('secretSantaMode');
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

// === ІНІЦІАЛІЗАЦІЯ ПРИ ЗАВАНТАЖЕННІ СТОРІНКИ ===
loadFromStorage();

// Відновлюємо збережений режим (якщо є)
const savedMode = localStorage.getItem('secretSantaMode');
if (savedMode) {
    const radio = document.querySelector(`input[name="mode"][value="${savedMode}"]`);
    if (radio) radio.checked = true;
}

// Оновлюємо інтерфейс
updateParticipantsList();
updateRestrictionsUI();
checkMinParticipants();
updateMode();
