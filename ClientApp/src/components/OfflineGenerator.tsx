import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Sparkles, RotateCcw, AlertCircle, ArrowRight } from 'lucide-react';

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

  return (
    <div className="offline-container">
      <div className="card add-participant-card">
        <h2>Швидке жеребкування на місці</h2>
        <p className="card-desc">
          Введіть імена учасників для миттєвого розподілу подарунків без реєстрації та збереження на сервері.
        </p>

        <form onSubmit={handleAddParticipant} className="add-form">
          <input
            type="text"
            placeholder="Ім'я учасника"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="input-text"
          />
          <button type="submit" className="btn btn-primary">
            <UserPlus size={18} />
            <span>Додати</span>
          </button>
        </form>

        {errorMsg && (
          <div className="alert-error">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {participants.length > 0 && (
        <div className="card participants-card">
          <div className="card-header-row">
            <h3>Учасники ({participants.length}):</h3>
            {participants.length < 3 && <span className="badge-warning">Потрібно мін. 3</span>}
          </div>

          <ul className="simple-list">
            {participants.map((name, i) => (
              <li key={i} className="list-item">
                <span className="item-name">{name}</span>
                <button
                  type="button"
                  className="btn-icon-danger"
                  onClick={() => handleRemoveParticipant(i)}
                  title="Видалити"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>

          <div className="mode-selection">
            <h4>Режим жеребкування:</h4>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="mode"
                  value="without"
                  checked={mode === 'without'}
                  onChange={() => setMode('without')}
                />
                Жеребкування без обмежень
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="mode"
                  value="with"
                  checked={mode === 'with'}
                  onChange={() => setMode('with')}
                />
                Жеребкування з обмеженнями
              </label>
            </div>
          </div>

          {mode === 'with' && participants.length >= 2 && (
            <div className="restrictions-box">
              <h4>Обмеження (хто кому НЕ може дарувати):</h4>
              {participants.map((giver, i) => (
                <div key={i} className="restriction-row">
                  <strong>{giver} не дарує:</strong>
                  <div className="checkboxes-wrap">
                    {participants.map((receiver, j) => {
                      if (i === j) return null;
                      return (
                        <label key={j} className="cb-label">
                          <input
                            type="checkbox"
                            checked={restrictions[i]?.[j] ?? false}
                            onChange={() => handleToggleRestriction(i, j)}
                          />
                          <span>{receiver}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="actions-row">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={participants.length < 3}
              onClick={handleShuffle}
            >
              <Sparkles size={20} />
              <span>Згенерувати жеребкування</span>
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleReset}>
              <RotateCcw size={18} />
              <span>Очистити все</span>
            </button>
          </div>
        </div>
      )}

      {pairs && pairs.length > 0 && (
        <div className="card results-card">
          <h3>🎄 Результати жеребкування:</h3>
          <div className="results-grid">
            {pairs.map((p, idx) => (
              <div key={idx} className="pair-card">
                <span className="giver-name">{p.giver}</span>
                <ArrowRight size={18} className="arrow-icon" />
                <span className="receiver-name">{p.receiver}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
