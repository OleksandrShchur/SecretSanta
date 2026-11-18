import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Gift,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Users,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import type { RoomPublic } from '../types';
import { getRoom, addParticipant } from '../api';
import { getTelegramUser, triggerHaptic } from '../telegram';
import { MyAssignmentCard } from './MyAssignmentCard';
import { FloatingInput, FloatingTextarea } from './FloatingInput';

interface JoinRoomProps {
  roomId: string;
  onGoHome?: () => void;
}

export const JoinRoom: React.FC<JoinRoomProps> = ({ roomId, onGoHome }) => {
  const [tgUser, setTgUser] = useState(getTelegramUser);

  useEffect(() => {
    const handleUserChange = () => {
      setTgUser(getTelegramUser());
    };
    window.addEventListener('tg_user_changed', handleUserChange);
    return () => window.removeEventListener('tg_user_changed', handleUserChange);
  }, []);

  const [room, setRoom] = useState<RoomPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [wishlist, setWishlist] = useState('');
  const [firstNameError, setFirstNameError] = useState<string | undefined>();
  const [firstNameTouched, setFirstNameTouched] = useState(false);

  const fetchRoom = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      try {
        const data = await getRoom(roomId, tgUser.id);
        setRoom(data);
        setErrorMsg(null);
        if (data.myRegistration) {
          setFirstName(data.myRegistration.firstName || '');
          setLastName(data.myRegistration.lastName || '');
          setWishlist(data.myRegistration.wishlist || '');
        } else {
          setFirstName(tgUser.first_name || '');
          setLastName(tgUser.last_name || '');
          setWishlist('');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Кімнату не знайдено');
      } finally {
        setLoading(false);
        if (isManual) setIsRefreshing(false);
      }
    },
    [roomId, tgUser.id, tgUser.first_name, tgUser.last_name]
  );

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // Polling every 5 seconds while collecting
  useEffect(() => {
    if (!room || room.status !== 'collecting') return;

    const interval = setInterval(() => {
      fetchRoom(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [room?.status, fetchRoom]);

  const validateFirstName = (val: string): string | undefined => {
    if (!val.trim()) {
      return "Вкажіть ваше ім'я";
    }
    if (val.trim().length > 50) {
      return "Ім'я не може перевищувати 50 символів";
    }
    return undefined;
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFirstName(val);
    if (firstNameTouched) {
      setFirstNameError(validateFirstName(val));
    }
  };

  const handleFirstNameBlur = () => {
    setFirstNameTouched(true);
    setFirstNameError(validateFirstName(firstName));
  };

  const handleCancelEdit = () => {
    triggerHaptic('light');
    if (room?.myRegistration) {
      setFirstName(room.myRegistration.firstName || '');
      setLastName(room.myRegistration.lastName || '');
      setWishlist(room.myRegistration.wishlist || '');
    }
    setFirstNameError(undefined);
    setFirstNameTouched(false);
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const err = validateFirstName(firstName);
    setFirstNameTouched(true);
    setFirstNameError(err);

    if (err) {
      triggerHaptic('warning');
      document.getElementById('join-first-name')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await addParticipant(roomId, {
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        telegramId: tgUser.id,
        telegramUsername: tgUser.username,
        wishlist: wishlist.trim() || undefined,
      });
      triggerHaptic('success');
      setIsEditing(false);
      await fetchRoom(true);
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMsg(err.message || 'Помилка збереження даних');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card loading-card">
        <RefreshCw size={28} className="spin text-gold mx-auto" />
        <p>Завантаження інформації про кімнату...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="card alert-error">
        <AlertCircle size={24} className="flex-shrink-0" />
        <div>
          <p>{errorMsg || 'Кімнату не знайдено'}</p>
          {onGoHome && (
            <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={onGoHome}>
              <ArrowLeft size={16} />
              <span>На головну</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const isParticipant = Boolean(room.myRegistration);

  // Helper to render participants list (with NO wishes, only name and surname)
  const renderParticipantsList = () => {
    return (
      <div className="card participants-section-card">
        <div className="card-header">
          <Users size={22} className="text-forest flex-shrink-0" />
          <div>
            <h3>Учасники кімнати ({room.participants.length})</h3>
            <p className="card-desc">
              {room.status === 'collecting'
                ? 'Список зареєстрованих учасників (побажання залишаються в секреті 🤫)'
                : 'Список зареєстрованих учасників гри'}
            </p>
          </div>
        </div>

        {room.participants.length === 0 ? (
          <p className="empty-state">Поки що немає зареєстрованих учасників.</p>
        ) : (
          <div className="participants-grid">
            {room.participants.map((p, idx) => {
              const isMe = p.id === room.myRegistration?.id;
              return (
                <div key={p.id} className={`participant-card-item ${isMe ? 'is-me' : ''}`}>
                  <div className="participant-card-top">
                    <div className="participant-main">
                      <div className="participant-num">{idx + 1}</div>
                      <div className="participant-details">
                        <div className="participant-name-row">
                          <strong className="participant-name">
                            {p.firstName} {p.lastName}
                          </strong>
                          {isMe && <span className="chip-is-me">Ви 🎅</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Helper to render user's own profile (read-only view)
  const renderMyReadOnlyProfile = () => {
    if (!room.myRegistration) return null;

    return (
      <div className="card my-registration-card">
        <div className="my-reg-header">
          <div className="my-reg-title-wrap">
            <CheckCircle2 size={22} className="text-forest flex-shrink-0" />
            <span className="my-reg-badge">Ви берете участь у цій кімнаті 🎉</span>
          </div>

          {room.status === 'collecting' && !isEditing && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-edit-profile"
              onClick={() => {
                triggerHaptic('light');
                setIsEditing(true);
              }}
            >
              <Pencil size={14} />
              <span>Змінити дані</span>
            </button>
          )}
        </div>

        <div className="readonly-profile-grid">
          <div className="readonly-field">
            <span className="readonly-label">Ваше ім'я та прізвище</span>
            <span className="readonly-value">
              {room.myRegistration.firstName} {room.myRegistration.lastName}
            </span>
          </div>

          <div className="readonly-field">
            <span className="readonly-label">Зареєстрований Telegram</span>
            <span className="readonly-value">
              {tgUser.username ? `@${tgUser.username.replace(/^@/, '')}` : `ID: ${tgUser.id}`}
            </span>
          </div>

          <div className="readonly-field readonly-field-full">
            <span className="readonly-label">Ваші побажання до подарунка</span>
            {room.myRegistration.wishlist ? (
              <div className="readonly-wishlist-box">
                <Gift size={16} className="text-gold flex-shrink-0 mt-0.5" />
                <p className="readonly-wishlist-text">{room.myRegistration.wishlist}</p>
              </div>
            ) : (
              <span className="readonly-wishlist-empty">
                (Побажання не вказано — ваш Санта обере подарунок від щирого серця! 🎄)
              </span>
            )}
          </div>
        </div>

        {room.status === 'collecting' && (
          <div className="success-box mt-1">
            <p className="success-hint">
              Щойно організатор (<strong>{room.hostName}</strong>) проведе жеребкування, бот надішле вам особисте повідомлення в Telegram з інформацією про вашого підопічного! 🎅✨
            </p>
          </div>
        )}
      </div>
    );
  };

  // 1. Shuffled view
  if (room.status === 'shuffled') {
    return (
      <div className="participant-room-view">
        <div className="card text-center">
          <span className="status-pill status-pill-shuffled mx-auto mb-2">Жеребкування проведено 🎉</span>
          <h2>{room.title}</h2>
          <p className="card-desc">
            Організатор: <strong>{room.hostName}</strong> • {room.participantCount} учасн.
          </p>
        </div>

        {isParticipant && <MyAssignmentCard roomId={roomId} telegramId={tgUser.id} />}

        {isParticipant && renderMyReadOnlyProfile()}

        {renderParticipantsList()}

        {onGoHome && (
          <button type="button" className="btn btn-secondary mt-3 mx-auto" onClick={onGoHome}>
            <ArrowLeft size={16} />
            <span>На головну</span>
          </button>
        )}
      </div>
    );
  }

  // 2. Closed view
  if (room.status === 'closed') {
    return (
      <div className="participant-room-view">
        <div className="card text-center">
          <AlertCircle size={36} className="text-muted mx-auto" />
          <h2>Кімнату деактивовано 🔒</h2>
          <p className="card-desc">
            Кімната «{room.title}» була деактивована організатором і більше не приймає учасників.
          </p>
        </div>

        {isParticipant && renderMyReadOnlyProfile()}

        {renderParticipantsList()}

        {onGoHome && (
          <button type="button" className="btn btn-secondary mt-3 mx-auto" onClick={onGoHome}>
            <ArrowLeft size={16} />
            <span>На головну</span>
          </button>
        )}
      </div>
    );
  }

  // 3. Collecting view
  return (
    <div className="participant-room-view">
      {/* Room Header Card */}
      <div className="card join-header-card">
        <div className="card-header-row mb-2">
          <span className="status-pill status-pill-collecting">Реєстрація відкрита 🎅</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => fetchRoom(true)}
            disabled={isRefreshing}
            title="Оновити дані"
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin text-gold' : ''} />
            <span>{isRefreshing ? 'Оновлення...' : 'Оновити'}</span>
          </button>
        </div>
        <h2>{room.title}</h2>
        <p className="card-desc">
          Організатор: <strong>{room.hostName}</strong> (зареєстровано {room.participantCount} учасн.)
        </p>
      </div>

      {errorMsg && (
        <div className="alert-error" role="alert">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Case A: User has ALREADY joined */}
      {isParticipant && (
        <>
          {/* Sub-case A1: READ-ONLY MODE (Default!) */}
          {!isEditing && renderMyReadOnlyProfile()}

          {/* Sub-case A2: EDITING MODE (Only if user clicked "Змінити дані") */}
          {isEditing && (
            <div className="card edit-profile-card">
              <div className="card-header">
                <Pencil size={20} className="text-forest flex-shrink-0" />
                <div>
                  <h3>Зміна ваших даних</h3>
                  <p className="card-desc">Оновіть ім'я чи побажання до подарунка</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="room-form" noValidate>
                <div className="form-row">
                  <FloatingInput
                    id="join-first-name"
                    label="Ваше ім'я"
                    placeholder="Іван"
                    icon={<User size={16} />}
                    value={firstName}
                    onChange={handleFirstNameChange}
                    onBlur={handleFirstNameBlur}
                    error={firstNameTouched ? firstNameError : undefined}
                    required
                  />

                  <FloatingInput
                    id="join-last-name"
                    label="Ваше прізвище"
                    placeholder="Коваленко"
                    icon={<User size={16} />}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>

                <FloatingTextarea
                  id="join-wishlist"
                  label="Побажання до подарунка (опціонально)"
                  placeholder="Що ви любите, розмір одягу, хобі або що точно НЕ варто дарувати..."
                  icon={<Gift size={16} />}
                  value={wishlist}
                  onChange={(e) => setWishlist(e.target.value)}
                  rows={3}
                />

                <div className="edit-form-actions">
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    <Check size={18} />
                    <span>{submitting ? 'Зберігаємо...' : 'Зберегти зміни'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancelEdit}
                    disabled={submitting}
                  >
                    <X size={18} />
                    <span>Скасувати</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* Case B: User has NOT joined yet */}
      {!isParticipant && (
        <div className="card join-card">
          <div className="join-form-header">
            <h3>Взяти участь у грі</h3>
            <p className="card-desc">Заповніть форму, щоб приєднатися до розіграшу</p>
          </div>

          <form onSubmit={handleSubmit} className="room-form" noValidate>
            <div className="form-row">
              <FloatingInput
                id="join-first-name"
                label="Ваше ім'я"
                placeholder="Іван"
                icon={<User size={16} />}
                value={firstName}
                onChange={handleFirstNameChange}
                onBlur={handleFirstNameBlur}
                error={firstNameTouched ? firstNameError : undefined}
                required
              />

              <FloatingInput
                id="join-last-name"
                label="Ваше прізвище"
                placeholder="Коваленко"
                icon={<User size={16} />}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <FloatingTextarea
              id="join-wishlist"
              label="Побажання до подарунка (опціонально)"
              placeholder="Що ви любите, розмір одягу, хобі або що точно НЕ варто дарувати..."
              icon={<Gift size={16} />}
              value={wishlist}
              onChange={(e) => setWishlist(e.target.value)}
              rows={3}
            />

            <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
              <Sparkles size={20} />
              <span>{submitting ? 'Зберігаємо...' : 'Взяти участь у Таємному Санті 🎁'}</span>
              <ArrowRight size={20} />
            </button>
          </form>
        </div>
      )}

      {/* Available participants list (only Name and Surname, no wishes!) */}
      {renderParticipantsList()}

      {onGoHome && (
        <button type="button" className="btn btn-secondary mt-3 mx-auto" onClick={onGoHome}>
          <ArrowLeft size={16} />
          <span>На головну</span>
        </button>
      )}
    </div>
  );
};
