(function () {
    const { saveState, loadState, clearState } = window.SecretSanta.storage;
    const { generateAssignment } = window.SecretSanta.algorithm;
    const { createUI } = window.SecretSanta.ui;

    let participants = [];
    let restrictions = [];
    let lastPairs = null;

    const ui = createUI({
        onRemoveParticipant: removeParticipant,
        onRestrictionChange: setRestriction,
    });

    function persist() {
        saveState({
            participants,
            restrictions,
            mode: ui.getMode(),
        });
    }

    function emptyMatrix(n) {
        return Array.from({ length: n }, () => Array(n).fill(false));
    }

    function sync(options = {}) {
        const showResults = Boolean(lastPairs) && participants.length >= 3;
        ui.syncUI({
            participants,
            restrictions,
            showResults,
            pairs: lastPairs,
            rebuildRestrictions: options.rebuildRestrictions !== false,
        });
    }

    function addParticipant(name) {
        const trimmed = name.trim();

        if (!trimmed) {
            ui.showPopup('Імʼя учасника не може бути порожнім!');
            return false;
        }

        if (participants.includes(trimmed)) {
            ui.showPopup('Учасник з таким імʼям вже існує!');
            return false;
        }

        const n = participants.length;
        participants.push(trimmed);
        restrictions.push(new Array(n + 1).fill(false));
        restrictions.forEach((row) => {
            if (row.length < n + 1) row.push(false);
        });

        lastPairs = null;
        persist();
        sync();
        return true;
    }

    function removeParticipant(index) {
        participants.splice(index, 1);
        restrictions.splice(index, 1);
        restrictions.forEach((row) => row.splice(index, 1));

        lastPairs = null;
        persist();
        sync();
    }

    function setRestriction(i, j, checked) {
        restrictions[i][j] = checked;
        persist();
        sync({ rebuildRestrictions: false });
    }

    function runGenerate() {
        const mode = ui.getMode();
        const result = generateAssignment(participants, restrictions, mode);

        if (!result.ok) {
            if (result.message) ui.showPopup(result.message);
            return;
        }

        lastPairs = result.pairs;
        sync({ rebuildRestrictions: false });
    }

    function resetAll() {
        participants = [];
        restrictions = [];
        lastPairs = null;
        clearState();
        sync();
    }

    function boot() {
        const loaded = loadState();
        participants = loaded.participants;
        restrictions = loaded.restrictions.length
            ? loaded.restrictions
            : emptyMatrix(participants.length);

        ui.setMode(loaded.mode);

        const addForm = document.getElementById('add-form');
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (addParticipant(ui.nameInput.value)) {
                ui.nameInput.value = '';
                ui.nameInput.focus();
            }
        });

        document.querySelectorAll('input[name="mode"]').forEach((radio) => {
            radio.addEventListener('change', () => {
                lastPairs = null;
                persist();
                sync();
            });
        });

        document.getElementById('generate-btn').addEventListener('click', runGenerate);
        document.getElementById('regen-btn').addEventListener('click', runGenerate);
        document.getElementById('reset-btn').addEventListener('click', resetAll);

        sync();
    }

    boot();
})();
