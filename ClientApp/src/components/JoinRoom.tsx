import React, { useState, useEffect } from 'react';
import {
  User,
  Gift,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
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
  const tgUser = getTelegramUser();

  const [room, setRoom] = useState<RoomPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(tgUser.first_name || '');
  const [lastName, setLastName] = useState(tgUser.last_name || '');
  const [wishlist, setWishlist] = useState('');
  const [joined, setJoined] = useState(false);
  const [firstNameError, setFirstNameError] = useState<string | undefined>();
  const [firstNameTouched, setFirstNameTouched] = useState(false);

  useEffect(() => {
    getRoom(roomId)
      .then((data) => setRoom(data))
      .catch((err) => setErrorMsg(err.message || 'Кімнату не знайдено'))
      .finally(() => setLoading(false));
  }, [roomId]);

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
      setJoined(true);
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMsg(err.message || 'Помилка реєстрації');
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

  // If already shuffled, show the assignment reveal card
  if (room.status === 'shuffled') {
    return (
      <div className="space-y-4">
        <div className="card text-center">
          <h2>Жеребкування проведено! 🎅</h2>
          <p className="card-desc">
            У кімнаті «{room.title}» вже завершився розподіл подарунків.
          </p>
        </div>

        <MyAssignmentCard roomId={roomId} telegramId={tgUser.id} />

        {onGoHome && (
          <button type="button" className="btn btn-secondary mt-3 mx-auto" onClick={onGoHome}>
            <ArrowLeft size={16} />
            <span>На головну</span>
          </button>
        )}
      </div>
    );
  }

  // If closed/deactivated, show a message
  if (room.status === 'closed') {
    return (
      <div className="card text-center">
        <AlertCircle size={36} className="text-muted mx-auto" />
        <h2>Кімнату деактивовано 🔒</h2>
        <p className="card-desc">
          Кімната «{room.title}» була деактивована організатором і більше не приймає учасників.
        </p>
        {onGoHome && (
          <button type="button" className="btn btn-secondary mt-3 mx-auto" onClick={onGoHome}>
            <ArrowLeft size={16} />
            <span>На головну</span>
          </button>
        )}
      </div>
    );
  }

  if (joined) {
    return (
      <div className="card success-card text-center">
        <CheckCircle2 size={52} className="text-forest mx-auto" />
        <h2>Чудово, {firstName}! 🎉</h2>
        <p className="success-subtitle">Ви успішно приєдналися до кімнати «{room.title}».</p>

        <div className="tg-user-banner my-3 justify-center">
          <div className="tg-user-avatar">
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div className="tg-user-info text-left">
            <span className="tg-user-label">Зареєстрований Telegram:</span>
            <span className="tg-user-name">
              {firstName} {lastName} {tgUser.username ? `(@${tgUser.username})` : `(ID: ${tgUser.id})`}
            </span>
          </div>
        </div>

        <div className="success-box">
          <p className="success-hint">
            Щойно організатор (<strong>{room.hostName}</strong>) запустить жеребкування, бот надішле вам особисте повідомлення в Telegram з інформацією про вашого підопічного! 🎅✨
          </p>
        </div>

        {onGoHome && (
          <button type="button" className="btn btn-secondary mt-3 mx-auto" onClick={onGoHome}>
            <ArrowLeft size={16} />
            <span>Повернутися на головну</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card join-card">
      <div className="join-header">
        <span className="badge-label">Запрошення до кімнати</span>
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
  );
};
