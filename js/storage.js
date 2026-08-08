window.SecretSanta = window.SecretSanta || {};

(function (ns) {
    const KEYS = {
        participants: 'secretSantaParticipants',
        restrictions: 'secretSantaRestrictions',
        mode: 'secretSantaMode',
    };

    function saveState({ participants, restrictions, mode }) {
        localStorage.setItem(KEYS.participants, JSON.stringify(participants));
        localStorage.setItem(KEYS.restrictions, JSON.stringify(restrictions));
        localStorage.setItem(KEYS.mode, mode || 'without');
    }

    function loadState() {
        const savedParticipants = localStorage.getItem(KEYS.participants);
        if (!savedParticipants) {
            return { participants: [], restrictions: [], mode: 'without' };
        }

        let participants = [];
        try {
            participants = JSON.parse(savedParticipants);
            if (!Array.isArray(participants)) participants = [];
        } catch {
            participants = [];
        }

        const n = participants.length;
        let restrictions = Array.from({ length: n }, () => Array(n).fill(false));

        const savedRestrictions = localStorage.getItem(KEYS.restrictions);
        if (savedRestrictions) {
            try {
                const parsed = JSON.parse(savedRestrictions);
                if (
                    Array.isArray(parsed) &&
                    parsed.length === n &&
                    parsed.every(row => Array.isArray(row) && row.length === n)
                ) {
                    restrictions = parsed;
                }
            } catch {
                // keep empty matrix
            }
        }

        const mode = localStorage.getItem(KEYS.mode) || 'without';
        return { participants, restrictions, mode };
    }

    function clearState() {
        localStorage.removeItem(KEYS.participants);
        localStorage.removeItem(KEYS.restrictions);
        localStorage.removeItem(KEYS.mode);
    }

    ns.storage = { saveState, loadState, clearState };
})(window.SecretSanta);
