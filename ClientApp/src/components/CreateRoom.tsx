import React, { useState } from 'react';
import { Sparkles, User, Gift, AlertCircle, ArrowRight, Check, Send } from 'lucide-react';
import { createRoom } from '../api';
import { getTelegramUser, triggerHaptic } from '../telegram';

interface CreateRoomProps {
  onRoomCreated: (roomId: string, adminToken: string) => void;
}

export const CreateRoom: React.FC<CreateRoomProps> = ({ onRoomCreated }) => {
  const tgUser = getTelegramUser();

  const [title, setTitle] = useState('');
  const [hostFirstName, setHostFirstName] = useState(tgUser.first_name || '');
  const [hostLastName, setHostLastName] = useState(tgUser.last_name || '');
  const [hostParticipates, setHostParticipates] = useState(true);
  const [hostWishlist, setHostWishlist] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !hostFirstName.trim()) {
      setErrorMsg("Будь ласка, заповніть назву кімнати та ваше ім'я.");
      triggerHaptic('warning');
      return;
    }

    setLoading(true);
    try {
      const room = await createRoom({
        title: title.trim(),
        hostFirstName: hostFirstName.trim(),
        hostLastName: hostLastName.trim() || undefined,
        hostTelegramId: tgUser.id,
        hostUsername: tgUser.username,
        hostParticipates,
        hostWishlist: hostWishlist.trim() || undefined,
      });

      triggerHaptic('success');
      onRoomCreated(room.id, room.adminToken);
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMsg(err.message || 'Не вдалося створити кімнату');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card create-room-card">
      <div className="card-header">
        <Sparkles size={24} className="text-gold flex-shrink-0" />
        <div>
          <h2>Створити кімнату в Telegram 🎅</h2>
          <p className="card-desc">
            Створіть святкову подію та надішліть посилання друзям прямо в Telegram! Після жеребкування бот надішле кожному особисте сповіщення з його підопічним.
          </p>
        </div>
      </div>

      {/* Telegram User Connected Badge */}
      <div className="tg-user-banner">
        <div className="tg-user-avatar">
          {hostFirstName.charAt(0).toUpperCase()}
        </div>
        <div className="tg-user-info">
          <span className="tg-user-label">Вхід через Telegram:</span>
          <span className="tg-user-name">
            {hostFirstName} {hostLastName} {tgUser.username ? `(@${tgUser.username})` : `(ID: ${tgUser.id})`}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="alert-error" role="alert">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="room-form">
        <div className="form-group">
          <label htmlFor="room-title">
            <Sparkles size={16} />
            <span>Назва кімнати або події *</span>
          </label>
          <input
            id="room-title"
            type="text"
            className="input-text"
            placeholder="напр., Новорічний офіс 2026 або Сім'я"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="host-first-name">
              <User size={16} />
              <span>Ваше ім'я *</span>
            </label>
            <input
              id="host-first-name"
              type="text"
              className="input-text"
              placeholder="Ім'я"
              value={hostFirstName}
              onChange={(e) => setHostFirstName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="host-last-name">
              <User size={16} />
              <span>Прізвище (опціонально)</span>
            </label>
            <input
              id="host-last-name"
              type="text"
              className="input-text"
              placeholder="Прізвище"
              value={hostLastName}
              onChange={(e) => setHostLastName(e.target.value)}
            />
          </div>
        </div>

        {/* Toggle host participating */}
        <div
          className={`toggle-card ${hostParticipates ? 'active' : ''}`}
          onClick={() => {
            triggerHaptic('light');
            setHostParticipates(!hostParticipates);
          }}
          role="checkbox"
          aria-checked={hostParticipates}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              triggerHaptic('light');
              setHostParticipates(!hostParticipates);
            }
          }}
        >
          <div className="toggle-card-checkbox">
            {hostParticipates && <Check size={14} className="toggle-check-icon" />}
          </div>
          <div className="toggle-card-text">
            <strong>Я також беру участь у жеребкуванні</strong>
            <span>Мене буде включено як дарувальника та отримувача</span>
          </div>
        </div>

        {hostParticipates && (
          <div className="form-group animate-fade-in">
            <label htmlFor="host-wishlist">
              <Gift size={16} />
              <span>Ваші побажання до подарунка (опціонально)</span>
            </label>
            <textarea
              id="host-wishlist"
              className="input-textarea"
              rows={3}
              placeholder="Що ви любите, захоплення, розмір або що краще НЕ дарувати..."
              value={hostWishlist}
              onChange={(e) => setHostWishlist(e.target.value)}
            />
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          <Send size={18} />
          <span>{loading ? 'Створюємо кімнату...' : 'Створити кімнату в Telegram'}</span>
          <ArrowRight size={20} />
        </button>
      </form>
    </div>
  );
};
