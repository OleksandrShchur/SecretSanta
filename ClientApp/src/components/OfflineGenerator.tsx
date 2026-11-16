import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Trash2,
  Sparkles,
  RotateCcw,
  AlertCircle,
  ArrowRight,
  Copy,
  Check,
  Sliders,
  Users,
} from 'lucide-react';

interface Pair {
  giver: string;
  receiver: string;
}

export const OfflineGenerator: React.FC = () => {
  const [participants, setParticipants] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('secret_santa_offline_participants');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [mode, setMode] = useState<'without' | 'with'>('without');
  const [restrictions, setRestrictions] = useState<boolean[][]>([]);
  const [pairs, setPairs] = useState<Pair[] | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedResults, setCopiedResults] = useState(false);

  useEffect(() => {
    localStorage.setItem('secret_santa_offline_participants', JSON.stringify(participants));
    setRestrictions((prev) => {
      const n = participants.length;
      const next = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => prev[i]?.[j] ?? false)
      );
      return next;
    });
  }, [participants]);

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setErrorMsg("Ім'я учасника не може бути порожнім!");
      return;
    }
    if (participants.includes(trimmed)) {
      setErrorMsg('Учасник з таким імʼям вже існує!');
      return;
    }

    setParticipants([...participants, trimmed]);
    setNameInput('');
    setErrorMsg(null);
    setPairs(null);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
    setPairs(null);
  };

  const handleToggleRestriction = (i: number, j: number) => {
    setRestrictions((prev) => {
      const copy = prev.map((row) => [...row]);
      copy[i][j] = !copy[i][j];
      return copy;
    });
    setPairs(null);
  };

  const handleShuffle = () => {
    setErrorMsg(null);
    const n = participants.length;
    if (n < 3) {
      setErrorMsg('Для жеребкування потрібно щонайменше 3 учасники!');
      return;
    }

    // Graph
    const graph: boolean[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i !== j && (mode === 'without' || !restrictions[i]?.[j]))
    );

    // Degree check
    for (let i = 0; i < n; i++) {
      let outDeg = 0;
      let inDeg = 0;
      for (let j = 0; j < n; j++) {
        if (graph[i][j]) outDeg++;
        if (graph[j][i]) inDeg++;
      }
      if (outDeg === 0 || inDeg === 0) {
        setErrorMsg(`Неможливо згенерувати жеребкування через обмеження для учасника ${participants[i]}.`);
        return;
      }
    }

    // Hamiltonian cycle DFS
    const shuffleArray = <T,>(arr: T[]): T[] => {
      const res = [...arr];
      for (let i = res.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [res[i], res[j]] = [res[j], res[i]];
      }
      return res;
    };

    const dfs = (path: number[], visited: boolean[]): number[] | null => {
      if (path.length === n) {
        return graph[path[n - 1]][path[0]] ? [...path] : null;
      }
      const last = path[path.length - 1];
      const candidates: number[] = [];
      for (let i = 0; i < n; i++) {
        if (graph[last][i] && !visited[i]) candidates.push(i);
      }
      const shuffled = shuffleArray(candidates);
      for (const v of shuffled) {
        visited[v] = true;
        path.push(v);
        const res = dfs(path, visited);
        if (res) return res;
        path.pop();
        visited[v] = false;
      }
      return null;
    };

    const visited = Array(n).fill(false);
    visited[0] = true;
    const cycle = dfs([0], visited);

    if (!cycle) {
      setErrorMsg('Не вдалося знайти варіант жеребкування. Спробуйте послабити обмеження.');
      return;
    }

    const generatedPairs: Pair[] = [];
    for (let i = 0; i < cycle.length; i++) {
      generatedPairs.push({
        giver: participants[cycle[i]],
        receiver: participants[cycle[(i + 1) % cycle.length]],
      });
    }

    setPairs(generatedPairs);
  };

  const handleReset = () => {
    if (confirm('Очистити список усіх учасників?')) {
      setParticipants([]);
      setPairs(null);
      setErrorMsg(null);
      localStorage.removeItem('secret_santa_offline_participants');
    }
  };

  const handleCopyResults = async () => {
    if (!pairs) return;
    const text =
      '🎅 Результати жеребкування «Таємний Санта» 🎄:\n\n' +
      pairs.map((p) => `• ${p.giver} ➔ ${p.receiver}`).join('\n') +
      '\n\nГарних свят! ✨';

    try {
      await navigator.clipboard.writeText(text);
      setCopiedResults(true);
      setTimeout(() => setCopiedResults(false), 2200);
    } catch {
      alert(text);
    }
  };

  return (
    <div className="offline-container">
      {/* Participant Addition Card */}
      <div className="card add-participant-card">
        <div className="card-header">
          <Sparkles size={24} className="text-gold" />
          <div>
            <h2>Швидке жеребкування на місці</h2>
            <p className="card-desc">
              Введіть імена учасників для миттєвого розподілу прямо на екрані без серверів та реєстрацій.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="alert-error" role="alert">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAddParticipant} className="add-form">
          <input
            type="text"
            placeholder="Введіть ім'я учасника..."
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="input-text"
            aria-label="Ім'я нового учасника"
          />
          <button type="submit" className="btn btn-primary btn-add">
            <UserPlus size={18} />
            <span>Додати</span>
          </button>
        </form>
      </div>

      {/* Participants List & Options */}
      {participants.length > 0 && (
        <div className="card participants-card">
          <div className="card-header-row">
            <div className="title-with-badge">
              <Users size={20} className="text-forest" />
              <h3>Учасники ({participants.length})</h3>
            </div>
            {participants.length < 3 && <span className="badge-warning">Потрібно мін. 3</span>}
          </div>

          <ul className="simple-list" aria-label="Список учасників">
            {participants.map((name, i) => (
              <li key={i} className="list-item">
                <div className="list-item-content">
                  <span className="participant-num">{i + 1}</span>
                  <span className="item-name">{name}</span>
                </div>
                <button
                  type="button"
                  className="btn-icon-danger"
                  onClick={() => handleRemoveParticipant(i)}
                  title={`Видалити ${name}`}
                  aria-label={`Видалити ${name}`}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>

          {/* Mode Selection with modern cards */}
          <div className="mode-selection">
            <label className="section-label">
              <Sliders size={16} />
              <span>Режим жеребкування</span>
            </label>
            <div className="mode-toggle-group">
              <button
                type="button"
                className={`mode-card-option ${mode === 'without' ? 'active' : ''}`}
                onClick={() => setMode('without')}
              >
                <div className="mode-card-header">
                  <span className="mode-radio-bullet" />
                  <strong>🎲 Без обмежень</strong>
                </div>
                <p className="mode-desc">Кожен може дарувати будь-кому</p>
              </button>

              <button
                type="button"
                className={`mode-card-option ${mode === 'with' ? 'active' : ''}`}
                onClick={() => setMode('with')}
              >
                <div className="mode-card-header">
                  <span className="mode-radio-bullet" />
                  <strong>⚖️ З обмеженнями</strong>
                </div>
                <p className="mode-desc">Виключити пари (напр. подружжя)</p>
              </button>
            </div>
          </div>

          {/* Restrictions Matrix using Chips */}
          {mode === 'with' && participants.length >= 2 && (
            <div className="restrictions-box">
              <div className="restrictions-box-header">
                <h4>Натисніть на ім'я, щоб заборонити пару:</h4>
                <span className="hint-pill">Червоний = заборонено</span>
              </div>
              <div className="restrictions-list">
                {participants.map((giver, i) => (
                  <div key={i} className="restriction-row">
                    <span className="giver-label">
                      <strong>{giver}</strong> не дарує:
                    </span>
                    <div className="chips-wrap">
                      {participants.map((receiver, j) => {
                        if (i === j) return null;
                        const isRestricted = restrictions[i]?.[j] ?? false;
                        return (
                          <button
                            key={j}
                            type="button"
                            className={`chip ${isRestricted ? 'chip-restricted' : 'chip-allowed'}`}
                            onClick={() => handleToggleRestriction(i, j)}
                            title={isRestricted ? `${giver} НЕ дарує ${receiver}` : `${giver} може дарувати ${receiver}`}
                          >
                            <span className="chip-icon">{isRestricted ? '✕' : '+'}</span>
                            <span className="chip-name">{receiver}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="actions-row">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={participants.length < 3}
              onClick={handleShuffle}
            >
              <Sparkles size={20} />
              <span>Згенерувати жеребкування 🎅</span>
            </button>
            <button type="button" className="btn btn-secondary btn-reset" onClick={handleReset}>
              <RotateCcw size={16} />
              <span>Очистити все</span>
            </button>
          </div>
        </div>
      )}

      {/* Results View */}
      {pairs && pairs.length > 0 && (
        <div className="card results-card">
          <div className="results-header">
            <div>
              <h3>🎄 Результати жеребкування:</h3>
              <p className="card-desc">Хто кому дарує новорічний подарунок</p>
            </div>
            <button
              type="button"
              className={`btn btn-sm ${copiedResults ? 'btn-success' : 'btn-secondary'}`}
              onClick={handleCopyResults}
            >
              {copiedResults ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedResults ? 'Скопійовано!' : 'Копіювати список'}</span>
            </button>
          </div>

          <div className="results-grid">
            {pairs.map((p, idx) => (
              <div key={idx} className="pair-card">
                <div className="giver-side">
                  <span className="role-tag">Дарує</span>
                  <span className="giver-name">{p.giver}</span>
                </div>
                <div className="pair-arrow-wrap" aria-hidden="true">
                  <ArrowRight size={18} className="arrow-icon" />
                </div>
                <div className="receiver-side">
                  <span className="role-tag role-tag-receiver">Отримує</span>
                  <span className="receiver-name">{p.receiver}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
