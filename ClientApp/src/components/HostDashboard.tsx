import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Copy,
  Check,
  Trash2,
  Sliders,
  Sparkles,
  RefreshCw,
  Gift,
  AlertCircle,
  CheckCircle2,
  Share2,
  MessageCircle,
  Power,
  MoreVertical,
} from 'lucide-react';
import type { RoomAdmin, TelegramConfig } from '../types';
import {
  getRoomAdmin,
  removeParticipant,
  saveRestrictions,
  performShuffle,
  getTelegramConfig,
  deactivateRoom,
  deleteRoom,
} from '../api';
import { getTelegramUser, openTelegramShare, triggerHaptic } from '../telegram';
import { MyAssignmentCard } from './MyAssignmentCard';

interface HostDashboardProps {
  roomId: string;
  adminToken: string;
  onGoHome?: () => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({ roomId, adminToken, onGoHome }) => {
  const tgUser = getTelegramUser();

  const [room, setRoom] = useState<RoomAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tgConfig, setTgConfig] = useState<TelegramConfig>({ botUsername: '', configured: false });

  // Link copy
  const [copiedLink, setCopiedLink] = useState(false);
  const [linkType, setLinkType] = useState<'tma' | 'web'>('tma');

  // Restrictions
  const [showRestrictions, setShowRestrictions] = useState(false);

  // Shuffle
  const [shuffling, setShuffling] = useState(false);
  const [shuffleSuccessMsg, setShuffleSuccessMsg] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Header 3-dots Menu
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setShowHeaderMenu(false);
      }
    };
    if (showHeaderMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showHeaderMenu]);

  useEffect(() => {
    getTelegramConfig().then(setTgConfig);
  }, []);

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

  // Polling every 4 seconds while collecting
  useEffect(() => {
    if (!room || room.status !== 'collecting') return;

    const interval = setInterval(() => {
      fetchRoomData();
    }, 4000);

    return () => clearInterval(interval);
  }, [room?.status, fetchRoomData]);

  // Generate Telegram Mini App and Web invite links
  const botUsername = tgConfig.botUsername?.replace(/^@/, '').trim();
  const appName = tgConfig.appShortName?.trim() || 'app';
  const tmaInviteUrl = botUsername
    ? `https://t.me/${botUsername}/${appName}?startapp=${roomId}`
    : '';
  const webInviteUrl = `${window.location.origin}?tab=online&room=${roomId}`;

  const inviteUrl = linkType === 'tma' && tmaInviteUrl ? tmaInviteUrl : webInviteUrl;

  const handleCopyLink = async () => {
    triggerHaptic('light');
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      alert('Посилання для приєднання: ' + inviteUrl);
    }
  };

  const handleShareTelegram = () => {
    triggerHaptic('light');
    const shareText = `Приєднуйтесь до гри «Таємний Санта» у кімнаті «${room?.title || ''}»! 🎅🎁 Відкривайте додаток та пишіть свої побажання:`;
    openTelegramShare(inviteUrl, shareText);
  };

  const handleRemove = async (participantId: string, name: string) => {
    if (!confirm(`Видалити учасника ${name}?`)) return;

    triggerHaptic('warning');
    try {
      await removeParticipant(roomId, participantId, adminToken);
      await fetchRoomData(true);
    } catch (err: any) {
      alert(err.message || 'Помилка видалення учасника');
    }
  };

  const handleToggleRestriction = async (giverId: string, receiverId: string) => {
    if (!room) return;

    triggerHaptic('light');
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
        'Після цього кімната закриється для нових заявок, а бот надішле кожному учаснику особисте сповіщення з його підопічним у Telegram.'
    );
    if (!confirmed) return;

    setShuffling(true);
    triggerHaptic('light');
    try {
      const res = await performShuffle(roomId, adminToken);
      if (res.notificationsSent < res.totalParticipants) {
        setShuffleSuccessMsg(
          `⚠️ Жеребкування проведено! Надіслано ${res.notificationsSent} з ${res.totalParticipants} Telegram-повідомлень. ${res.errorMessage || ''}`
        );
      } else {
        setShuffleSuccessMsg(
          `🎉 Жеребкування успішно проведено! Розіслано всі ${res.notificationsSent} сповіщень у Telegram.`
        );
      }
      triggerHaptic('success');
      await fetchRoomData(true);
    } catch (err: any) {
      triggerHaptic('error');
      alert('Помилка жеребкування:\n' + err.message);
    } finally {
      setShuffling(false);
    }
  };

  const handleDeactivateRoom = async () => {
    if (!room) return;
    if (!confirm(`Деактивувати кімнату «${room.title}»?\n\nКімнату буде закрито для нових учасників.`)) return;

    setDeactivating(true);
    triggerHaptic('warning');
    try {
      await deactivateRoom(roomId, adminToken);
      triggerHaptic('success');
      await fetchRoomData(true);
    } catch (err: any) {
      triggerHaptic('error');
      alert('Помилка деактивації: ' + err.message);
    } finally {
      setDeactivating(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!room) return;
    if (!confirm(`Видалити кімнату «${room.title}»?\n\n⚠️ Це видалить усіх учасників, жеребкування та всі дані кімнати назавжди!`)) return;

    setDeleting(true);
    triggerHaptic('warning');
    try {
      await deleteRoom(roomId, adminToken);
      triggerHaptic('success');
      onGoHome?.();
    } catch (err: any) {
      triggerHaptic('error');
      alert('Помилка видалення: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="card loading-card">
        <RefreshCw size={32} className="spin text-gold" />
        <p>Завантаження даних кімнати...</p>
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
  const isClosed = room.status === 'closed';
  const hostIsParticipant = room.participants.some((p) => p.telegramId === tgUser.id);

  return (
    <div className="dashboard-container">
      {/* Header Card */}
      <div className="card dashboard-header-card">
        {/* Top-Right 3-dots Actions Menu */}
        <div className="dashboard-top-menu" ref={headerMenuRef}>
          <button
            type="button"
            className="btn-card-menu"
            onClick={() => {
              triggerHaptic('light');
              setShowHeaderMenu((prev) => !prev);
            }}
            aria-label="Дії з кімнатою"
            title="Опції кімнати"
          >
            <MoreVertical size={20} />
          </button>

          {showHeaderMenu && (
            <div className="card-menu-dropdown animate-fade-in">
              {room.status === 'collecting' && (
                <button
                  type="button"
                  className="card-menu-item card-menu-item-warning"
                  onClick={() => {
                    setShowHeaderMenu(false);
                    handleDeactivateRoom();
                  }}
                  disabled={deactivating}
                >
                  <Power size={15} />
                  <span>{deactivating ? 'Деактивація...' : 'Деактивувати кімнату'}</span>
                </button>
              )}
              <button
                type="button"
                className="card-menu-item card-menu-item-danger"
                onClick={() => {
                  setShowHeaderMenu(false);
                  handleDeleteRoom();
                }}
                disabled={deleting}
              >
                <Trash2 size={15} />
                <span>{deleting ? 'Видалення...' : 'Видалити кімнату'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="dashboard-header-top">
          <div className="dashboard-title-group">
            <span className="badge-label">Панель організатора</span>
            <h2>{room.title}</h2>
          </div>
          <div className="header-actions">
            <span
              className={`status-pill ${
                isShuffled
                  ? 'status-pill-shuffled'
                  : isClosed
                  ? 'status-pill-closed'
                  : 'status-pill-collecting'
              }`}
            >
              {isShuffled
                ? 'Жеребкування проведено 🎉'
                : isClosed
                ? 'Деактивовано 🔒'
                : 'Реєстрація відкрита 🎅'}
            </span>
          </div>
        </div>

        {shuffleSuccessMsg && (
          <div className="alert-success" role="alert">
            <CheckCircle2 size={20} className="flex-shrink-0" />
            <span>{shuffleSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Host's Own Assignment Card (if shuffled and host participates) */}
      {isShuffled && hostIsParticipant && (
        <div className="mb-4">
          <MyAssignmentCard roomId={roomId} telegramId={tgUser.id} />
        </div>
      )}

      {/* Invite Card via Telegram */}
      {!isShuffled && !isClosed && (
        <div className="card invite-card">
          <div className="card-header">
            <MessageCircle size={22} className="text-forest flex-shrink-0" />
            <div>
              <h3>Запросити учасників у Telegram</h3>
              <p className="card-desc">Поділіться посиланням у групах чи особистих повідомленнях Telegram</p>
            </div>
          </div>

          <div className="invite-block">
            <div className="invite-type-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={linkType === 'tma'}
                className={`invite-type-tab ${linkType === 'tma' ? 'active' : ''}`}
                onClick={() => setLinkType('tma')}
              >
                📱 Telegram Mini App
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={linkType === 'web'}
                className={`invite-type-tab ${linkType === 'web' ? 'active' : ''}`}
                onClick={() => setLinkType('web')}
              >
                🌐 Веб-посилання (браузер)
              </button>
            </div>

            <label className="field-label" htmlFor="invite-url-field">
              {linkType === 'tma'
                ? 'Telegram-посилання (відкриває Mini App у Telegram):'
                : 'Пряме веб-посилання (відкриває в будь-якому браузері):'}
            </label>
            <div className="invite-link-row">
              <input
                id="invite-url-field"
                type="text"
                readOnly
                value={inviteUrl}
                className="input-text invite-input"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                className={`btn ${copiedLink ? 'btn-success' : 'btn-secondary'} btn-copy`}
                onClick={handleCopyLink}
                title="Скопіювати посилання"
              >
                {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedLink ? 'Скопійовано!' : 'Копіювати'}</span>
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-share-telegram"
              onClick={handleShareTelegram}
              title="Поділитися в Telegram"
            >
              <Share2 size={18} />
              <span>Поділитись у Telegram</span>
            </button>
          </div>
        </div>
      )}

      {/* Participants Card */}
      <div className="card participants-card">
        <div className="card-header-row">
          <div className="title-with-badge">
            <Users size={20} className="text-forest flex-shrink-0" />
            <h3>Учасники ({room.participants.length})</h3>
          </div>
          {room.participants.length < 3 && !isShuffled && (
            <span className="badge-warning">Потрібно мін. 3</span>
          )}
        </div>

        {room.participants.length === 0 ? (
          <p className="empty-state">
            Поки що немає зареєстрованих учасників. Надішліть посилання друзям у Telegram!
          </p>
        ) : (
          <div className="participants-grid">
            {room.participants.map((p, idx) => (
              <div key={p.id} className="participant-card-item">
                <div className="participant-card-top">
                  <div className="participant-main">
                    <div className="participant-num">{idx + 1}</div>
                    <div className="participant-details">
                      <strong className="participant-name">
                        {p.firstName} {p.lastName}
                      </strong>
                      <span className="participant-tg-handle">
                        {p.telegramUsername ? `@${p.telegramUsername.replace(/^@/, '')}` : `ID: ${p.telegramId}`}
                      </span>
                    </div>
                  </div>

                  {!isShuffled && !isClosed && (
                    <button
                      type="button"
                      className="btn-icon-danger"
                      onClick={() => handleRemove(p.id, `${p.firstName} ${p.lastName}`)}
                      title={`Видалити ${p.firstName} ${p.lastName}`}
                      aria-label={`Видалити ${p.firstName} ${p.lastName}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {p.wishlist && (
                  <div className="wishlist-tag">
                    <Gift size={14} className="flex-shrink-0" />
                    <span>Побажання: {p.wishlist}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restrictions Card with Chips */}
      {room.participants.length >= 2 && (
        <div className="card restrictions-card">
          <div className="restrictions-header">
            <div className="title-with-badge">
              <Sliders size={20} className="text-forest flex-shrink-0" />
              <div>
                <h3>Пари виключень (обмеження)</h3>
                <p className="card-desc">Хто кому не повинен дарувати подарунок</p>
              </div>
            </div>
            <button
              type="button"
              className={`btn btn-sm ${showRestrictions ? 'btn-secondary' : 'btn-outline'}`}
              onClick={() => setShowRestrictions(!showRestrictions)}
            >
              {showRestrictions ? 'Приховати' : 'Налаштувати'}
            </button>
          </div>

          {showRestrictions && (
            <div className="restrictions-box">
              <div className="restrictions-box-header">
                <h4>Натисніть на ім'я, щоб заборонити пару:</h4>
                <span className="hint-pill">Червоний = заборонено</span>
              </div>
              <div className="restrictions-list">
                {room.participants.map((giver) => (
                  <div key={giver.id} className="restriction-row">
                    <span className="giver-label">
                      <strong>
                        {giver.firstName} {giver.lastName}
                      </strong>{' '}
                      не дарує:
                    </span>
                    <div className="chips-wrap">
                      {room.participants.map((receiver) => {
                        if (giver.id === receiver.id) return null;
                        const isRestricted = room.restrictions?.some(
                          (r) => r.giverId === giver.id && r.receiverId === receiver.id
                        );
                        return (
                          <button
                            key={receiver.id}
                            type="button"
                            disabled={isShuffled}
                            className={`chip ${isRestricted ? 'chip-restricted' : 'chip-allowed'}`}
                            onClick={() => handleToggleRestriction(giver.id, receiver.id)}
                            title={
                              isRestricted
                                ? `${giver.firstName} НЕ дарує ${receiver.firstName}`
                                : `${giver.firstName} може дарувати ${receiver.firstName}`
                            }
                          >
                            <span className="chip-icon">{isRestricted ? '✕' : '+'}</span>
                            <span className="chip-name">
                              {receiver.firstName} {receiver.lastName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shuffle Section */}
      {!isClosed && (
      <div className="card shuffle-card">
        {isShuffled ? (
          <div className="shuffled-box">
            <CheckCircle2 size={36} className="text-forest" />
            <h3>Жеребкування успішно завершено! 🎄</h3>
            <p>
              Усі учасники отримали персональні святкові повідомлення від бота в Telegram. Кімната закрита для змін.
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
                  ? 'Жеребкуємо та надсилаємо сповіщення...'
                  : '🎅 Провести жеребкування та розіслати в Telegram'}
              </span>
            </button>
            <p className="cta-hint">
              {room.participants.length >= 3
                ? 'Кожен учасник отримає святкове повідомлення від бота з іменем свого підопічного.'
                : `Для жеребкування потрібно щонайменше 3 учасники (зараз: ${room.participants.length}).`}
            </p>
          </div>
        )}
      </div>
      )}

      {/* Closed room message */}
      {isClosed && (
        <div className="card shuffle-card">
          <div className="shuffled-box">
            <Power size={36} className="text-muted" />
            <h3>Кімнату деактивовано 🔒</h3>
            <p>
              Ця кімната закрита для нових учасників та жеребкування. Ви можете видалити її або залишити для архіву.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
