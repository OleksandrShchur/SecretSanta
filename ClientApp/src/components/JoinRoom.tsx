import React, { useState, useEffect } from 'react';
import { User, Mail, Gift, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import type { RoomPublic } from '../types';
import { getRoom, addParticipant } from '../api';

interface JoinRoomProps {
  roomId: string;
}

export const JoinRoom: React.FC<JoinRoomProps> = ({ roomId }) => {
  const [room, setRoom] = useState<RoomPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [wishlist, setWishlist] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    getRoom(roomId)
      .then((data) => setRoom(data))
      .catch((err) => setErrorMsg(err.message || 'Кімнату не знайдено'))
      .finally(() => setLoading(false));
  }, [roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!firstName.trim() || !email.trim()) {
      setErrorMsg("Будь ласка, введіть ім'я та email.");
      return;
    }

    setSubmitting(true);
    try {
      await addParticipant(roomId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        wishlist: wishlist.trim(),
      });
      setJoined(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Помилка реєстрації');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card loading-card">
        <p>Завантаження інформації про кімнату...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="card alert-error">
        <AlertCircle size={24} />
        <p>{errorMsg || 'Кімнату не знайдено'}</p>
      </div>
    );
  }

  if (room.status === 'shuffled') {
    return (
      <div className="card text-center">
        <h2>Жеребкування вже завершено 🎅</h2>
        <p className="card-desc">
          На жаль, прийом заявок у кімнату «{room.title}» вже закрито, оскільки організатор провів
          розподіл подарунків і розіслав листи.
        </p>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="card success-card text-center">
        <CheckCircle2 size={48} className="text-forest mx-auto" />
        <h2>Чудово, {firstName}! 🎉</h2>
        <p>Ваші дані успішно збережено для кімнати «{room.title}».</p>
        <p className="success-hint">
          Щойно організатор ({room.hostName}) проведе жеребкування, ви отримаєте лист на вашу пошту (
          <strong>{email}</strong>) з інформацією про людину, якій ви даруватимете подарунок! 🎅✨
        </p>
      </div>
    );
  }

  return (
    <div className="card join-card">
      <div className="join-header">
        <span className="badge-label">Запрошення до кімнати</span>
        <h2>{room.title}</h2>
        <p className="card-desc">
          Організатор: <strong>{room.hostName}</strong>
        </p>
      </div>

      {errorMsg && (
        <div className="alert-error">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="room-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="join-first-name">
              <User size={16} />
              <span>Ваше ім'я *</span>
            </label>
            <input
              id="join-first-name"
              type="text"
              className="input-text"
              placeholder="Іван"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="join-last-name">
              <User size={16} />
              <span>Ваше прізвище *</span>
            </label>
            <input
              id="join-last-name"
              type="text"
              className="input-text"
              placeholder="Коваленко"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="join-email">
            <Mail size={16} />
            <span>Ваш Email (для отримання результатів) *</span>
          </label>
          <input
            id="join-email"
            type="email"
            className="input-text"
            placeholder="ivan@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="join-wishlist">
            <Gift size={16} />
            <span>Побажання до подарунка (опціонально)</span>
          </label>
          <textarea
            id="join-wishlist"
            className="input-textarea"
            rows={3}
            placeholder="Що ви любите, розмір одягу, улюблені книги чи що краще НЕ дарувати..."
            value={wishlist}
            onChange={(e) => setWishlist(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
          <span>{submitting ? 'Зберігаємо...' : 'Взяти участь у Таємному Санті 🎁'}</span>
          <ArrowRight size={20} />
        </button>
      </form>
    </div>
  );
};
