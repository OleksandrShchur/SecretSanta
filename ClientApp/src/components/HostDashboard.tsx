import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Copy,
  Check,
  Send,
  Trash2,
  Sliders,
  Sparkles,
  RefreshCw,
  Gift,
  AlertCircle,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import type { RoomAdmin } from '../types';
import {
  getRoomAdmin,
  removeParticipant,
  saveRestrictions,
  sendInvites,
  performShuffle,
} from '../api';

interface HostDashboardProps {
  roomId: string;
  adminToken: string;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({ roomId, adminToken }) => {
  const [room, setRoom] = useState<RoomAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Link copy
  const [copied, setCopied] = useState(false);

  // Email invites
  const [inviteEmails, setInviteEmails] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // Restrictions
  const [showRestrictions, setShowRestrictions] = useState(false);

  // Shuffle
  const [shuffling, setShuffling] = useState(false);
  const [shuffleSuccessMsg, setShuffleSuccessMsg] = useState<string | null>(null);

  const fetchRoomData = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      try {
        const data = await getRoomAdmin(roomId, adminToken);
        setRoom(data);
        setErrorMsg(null);
      } catch (err: any) {
        setErrorMsg(err.message || 'Не вдалося оновити дані кімнати');
      } finally {
        setLoading(false);
        if (isManual) setIsRefreshing(false);
      }
    },
    [roomId, adminToken]
  );

  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  // Smart polling for MonsterASP (every 4 seconds while collecting)
  useEffect(() => {
    if (!room || room.status !== 'collecting') return;

    const interval = setInterval(() => {
      fetchRoomData();
    }, 4000);

    return () => clearInterval(interval);
  }, [room?.status, fetchRoomData]);

  const inviteUrl = `${window.location.origin}?tab=online&room=${roomId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Посилання для приєднання: ' + inviteUrl);
    }
  };

  const handleSendInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSuccessMsg(null);
    const emails = inviteEmails
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      alert('Введіть щонайменше одну адресу email.');
      return;
    }

    setSendingInvites(true);
    try {
      const res = await sendInvites(roomId, adminToken, emails, inviteUrl);
      setInviteSuccessMsg(`Успішно надіслано ${res.sentCount} запрошень!`);
      setInviteEmails('');
    } catch (err: any) {
      alert('Помилка відправки запрошень: ' + err.message);
    } finally {
      setSendingInvites(false);
    }
  };

  const handleRemove = async (participantId: string, name: string) => {
    if (!confirm(`Видалити учасника ${name}?`)) return;

    try {
      await removeParticipant(roomId, participantId, adminToken);
      await fetchRoomData(true);
    } catch (err: any) {
      alert(err.message || 'Помилка видалення учасника');
    }
  };

  const handleToggleRestriction = async (giverId: string, receiverId: string) => {
    if (!room) return;

    const current = room.restrictions || [];
    const exists = current.some((r) => r.giverId === giverId && r.receiverId === receiverId);

    const next = exists
      ? current.filter((r) => !(r.giverId === giverId && r.receiverId === receiverId))
      : [...current, { id: '', giverId, receiverId }];

    try {
      await saveRestrictions(
        roomId,
        adminToken,
        next.map((r) => ({ giverId: r.giverId, receiverId: r.receiverId }))
      );
      await fetchRoomData();
    } catch (err: any) {
      alert('Помилка збереження обмежень: ' + err.message);
    }
  };

  const handlePerformShuffle = async () => {
    if (!room || room.participants.length < 3) {
      alert('Для жеребкування потрібно щонайменше 3 учасники!');
      return;
    }

    const confirmed = confirm(
      'Ви впевнені, що хочете провести жеребкування?\n\n' +
        'Після цього кімната закриється для нових учасників, а кожному учаснику буде надіслано лист із його підопічним.'
    );
    if (!confirmed) return;

    setShuffling(true);
    try {
      const res = await performShuffle(roomId, adminToken);
      setShuffleSuccessMsg(
        `🎉 Жеребкування успішно проведено! Розіслано ${res.emailsSent} листів із ${res.totalParticipants} учасників.`
      );
      await fetchRoomData(true);
    } catch (err: any) {
      alert('Помилка жеребкування:\n' + err.message);
    } finally {
      setShuffling(false);
    }
  };

  if (loading) {
    return (
      <div className="card loading-card">
        <RefreshCw size={32} className="spin text-gold" />
        <p>Завантаження кімнати...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="card alert-error">
        <AlertCircle size={24} />
        <p>{errorMsg || 'Не вдалося завантажити інформацію про кімнату'}</p>
      </div>
    );
  }

  const isShuffled = room.status === 'shuffled';

  return (
    <div className="dashboard-container">
      {/* Header Card */}
      <div className="card dashboard-header-card">
        <div className="dashboard-header-top">
          <div>
            <span className="badge-label">Панель організатора</span>
            <h2>{room.title}</h2>
          </div>
          <div className="header-actions">
            <span
              className={`status-pill ${
                isShuffled ? 'status-pill-shuffled' : 'status-pill-collecting'
              }`}
            >
              {isShuffled ? 'Жеребкування проведено 🎉' : 'Збір учасників 🎅'}
            </span>
            <button
              type="button"
              className="btn-icon"
              onClick={() => fetchRoomData(true)}
              title="Оновити список"
            >
              <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {shuffleSuccessMsg && (
          <div className="alert-success">
            <CheckCircle2 size={20} />
            <span>{shuffleSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Invite Card */}
      {!isShuffled && (
        <div className="card invite-card">
          <div className="card-header">
            <Mail size={20} className="text-forest" />
            <h3>Запросити учасників</h3>
          </div>

          <div className="invite-block">
            <label>Посилання для приєднання:</label>
            <div className="copy-row">
              <input type="text" readOnly value={inviteUrl} className="input-text" />
              <button
                type="button"
                className={`btn ${copied ? 'btn-success' : 'btn-secondary'}`}
                onClick={handleCopyLink}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                <span>{copied ? 'Скопійовано!' : 'Скопіювати'}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSendInvites} className="email-invites-form">
            <label>Або надіслати запрошення на Email (через кому чи з нового рядка):</label>
            <textarea
              className="input-textarea"
              rows={2}
              placeholder="friend1@example.com, friend2@example.com"
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-secondary-sm"
              disabled={sendingInvites || !inviteEmails.trim()}
            >
              <Send size={16} />
              <span>{sendingInvites ? 'Надсилаємо...' : 'Надіслати запрошення ✉️'}</span>
            </button>

            {inviteSuccessMsg && <p className="success-note">{inviteSuccessMsg}</p>}
          </form>
        </div>
      )}

      {/* Participants Card */}
      <div className="card participants-card">
        <div className="card-header-row">
          <div className="title-with-badge">
            <Users size={20} className="text-forest" />
            <h3>Учасники ({room.participants.length})</h3>
          </div>
          {room.participants.length < 3 && !isShuffled && (
            <span className="badge-warning">Потрібно мін. 3</span>
          )}
        </div>

        {room.participants.length === 0 ? (
          <p className="empty-state">
            Поки що немає зареєстрованих учасників. Надішліть посилання друзям!
          </p>
        ) : (
          <div className="participants-grid">
            {room.participants.map((p, idx) => (
              <div key={p.id} className="participant-card-item">
                <div className="participant-main">
                  <div className="participant-num">{idx + 1}</div>
                  <div className="participant-details">
                    <strong className="participant-name">
                      {p.firstName} {p.lastName}
                    </strong>
                    <span className="participant-email">{p.email}</span>
                  </div>
                </div>

                {p.wishlist && (
                  <div className="wishlist-tag">
                    <Gift size={14} />
                    <span>{p.wishlist}</span>
                  </div>
                )}

                {!isShuffled && (
                  <button
                    type="button"
                    className="btn-icon-danger"
                    onClick={() => handleRemove(p.id, `${p.firstName} ${p.lastName}`)}
                    title="Видалити учасника"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restrictions Card */}
      {room.participants.length >= 2 && (
        <div className="card restrictions-card">
          <div className="restrictions-header">
            <div className="title-with-badge">
              <Sliders size={20} className="text-forest" />
              <h3>Пари виключень (обмеження)</h3>
            </div>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showRestrictions}
                onChange={(e) => setShowRestrictions(e.target.checked)}
              />
              <span>Показати матрицю</span>
            </label>
          </div>

          {showRestrictions && (
            <div className="restrictions-matrix">
              {room.participants.map((giver) => (
                <div key={giver.id} className="matrix-row">
                  <strong>
                    {giver.firstName} {giver.lastName} не дарує:
                  </strong>
                  <div className="matrix-checkboxes">
                    {room.participants.map((receiver) => {
                      if (giver.id === receiver.id) return null;
                      const isRestricted = room.restrictions?.some(
                        (r) => r.giverId === giver.id && r.receiverId === receiver.id
                      );
                      return (
                        <label key={receiver.id} className="cb-label-sm">
                          <input
                            type="checkbox"
                            disabled={isShuffled}
                            checked={isRestricted}
                            onChange={() => handleToggleRestriction(giver.id, receiver.id)}
                          />
                          <span>
                            {receiver.firstName} {receiver.lastName}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shuffle Section */}
      <div className="card shuffle-card">
        {isShuffled ? (
          <div className="shuffled-box">
            <CheckCircle2 size={32} className="text-forest" />
            <h3>Жеребкування успішно завершено! 🎄</h3>
            <p>
              Усі учасники отримали персональні листи з підопічними на свій Email. Кімната закрита
              для змін.
            </p>
          </div>
        ) : (
          <div className="shuffle-cta">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={room.participants.length < 3 || shuffling}
              onClick={handlePerformShuffle}
            >
              <Sparkles size={22} />
              <span>
                {shuffling
                  ? 'Жеребкуємо та розсилаємо листи...'
                  : '🎅 Провести жеребкування та розіслати листи'}
              </span>
            </button>
            <p className="cta-hint">
              {room.participants.length >= 3
                ? 'Кожен учасник отримає святковий лист із іменем свого підопічного.'
                : `Для жеребкування потрібно мінімум 3 учасники (зараз: ${room.participants.length}).`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
