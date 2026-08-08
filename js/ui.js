window.SecretSanta = window.SecretSanta || {};

(function (ns) {
    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function createUI({ onRemoveParticipant, onRestrictionChange }) {
        const nameInput = document.getElementById('name-input');
        const participantsUl = document.getElementById('participants-ul');
        const restrictionsDiv = document.getElementById('restrictions-div');
        const resultsUl = document.getElementById('results-ul');

        const modeSection = document.getElementById('mode-section');
        const restrictionsSection = document.getElementById('restrictions-section');
        const generateSection = document.getElementById('generate-section');
        const resultsSection = document.getElementById('results-section');

        const popupOverlay = document.getElementById('popup-overlay');
        const popupMessage = document.getElementById('popup-message');
        const popupClose = document.getElementById('popup-close');

        function setHidden(el, hidden) {
            if (!el) return;
            el.classList.toggle('is-hidden', hidden);
        }

        function showPopup(message) {
            popupMessage.innerHTML = escapeHtml(message).replace(/\n/g, '<br>');
            setHidden(popupOverlay, false);
        }

        function hidePopup() {
            setHidden(popupOverlay, true);
        }

        if (popupClose) popupClose.addEventListener('click', hidePopup);
        if (popupOverlay) {
            popupOverlay.addEventListener('click', (e) => {
                if (e.target === popupOverlay) hidePopup();
            });
        }

        function getMode() {
            return document.querySelector('input[name="mode"]:checked')?.value || 'without';
        }

        function setMode(mode) {
            const radio = document.querySelector(`input[name="mode"][value="${mode}"]`);
            if (radio) radio.checked = true;
        }

        function renderParticipants(participants) {
            participantsUl.replaceChildren();
            participants.forEach((name, i) => {
                const li = document.createElement('li');
                const label = document.createElement('span');
                label.className = 'participant-name';
                label.textContent = name;

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = 'Видалити';
                btn.addEventListener('click', () => onRemoveParticipant(i));

                li.append(label, btn);
                participantsUl.appendChild(li);
            });
        }

        function renderRestrictions(participants, restrictions) {
            restrictionsDiv.replaceChildren();
            if (participants.length < 2) return;

            participants.forEach((name, i) => {
                const block = document.createElement('div');
                block.className = 'restriction-block';

                const title = document.createElement('p');
                title.className = 'restriction-title';
                title.textContent = `${name} не може дарувати:`;

                const options = document.createElement('div');
                options.className = 'restriction-options';

                participants.forEach((other, j) => {
                    if (i === j) return;

                    const label = document.createElement('label');
                    label.className = 'restriction-option';

                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.checked = restrictions[i][j];
                    cb.addEventListener('change', () => {
                        onRestrictionChange(i, j, cb.checked);
                    });

                    label.append(cb, document.createTextNode(` ${other}`));
                    options.appendChild(label);
                });

                block.append(title, options);
                restrictionsDiv.appendChild(block);
            });
        }

        function renderResults(pairs) {
            resultsUl.replaceChildren();
            pairs.forEach(({ giver, receiver }) => {
                const li = document.createElement('li');
                li.textContent = `${giver} → дарує подарунок → ${receiver}`;
                resultsUl.appendChild(li);
            });
        }

        function clearResults() {
            resultsUl.replaceChildren();
        }

        function syncUI({
            participants,
            restrictions,
            showResults,
            pairs = null,
            rebuildRestrictions = true,
        }) {
            const count = participants.length;
            const mode = getMode();
            const showModeAndGenerate = count >= 3;
            const showRestrictions = mode === 'with' && count >= 2;

            renderParticipants(participants);

            setHidden(modeSection, !showModeAndGenerate);
            setHidden(generateSection, !showModeAndGenerate);
            setHidden(restrictionsSection, !showRestrictions);

            if (showRestrictions && rebuildRestrictions) {
                renderRestrictions(participants, restrictions);
            }

            if (showResults && pairs) {
                renderResults(pairs);
                setHidden(resultsSection, false);
            } else if (!showResults || count < 3) {
                clearResults();
                setHidden(resultsSection, true);
            }
        }

        return {
            nameInput,
            showPopup,
            hidePopup,
            getMode,
            setMode,
            syncUI,
            clearResults,
        };
    }

    ns.ui = { createUI };
})(window.SecretSanta);
