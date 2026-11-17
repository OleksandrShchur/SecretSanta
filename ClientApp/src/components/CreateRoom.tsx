import React, { useState } from 'react';
import { Sparkles, User, Mail, Gift, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { createRoom } from '../api';

interface CreateRoomProps {
  onRoomCreated: (roomId: string, adminToken: string) => void;
}

export const CreateRoom: React.FC<CreateRoomProps> = ({ onRoomCreated }) => {
  const [title, setTitle] = useState('');
  const [hostFirstName, setHostFirstName] = useState('');
  const [hostLastName, setHostLastName] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [hostParticipates, setHostParticipates] = useState(true);
  const [hostWishlist, setHostWishlist] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !hostFirstName.trim() || !hostEmail.trim()) {
      setErrorMsg("Будь ласка, заповніть усі обов'язкові поля.");
      return;
    }

    setLoading(true);
    try {
      const room = await createRoom({
        title: title.trim(),
        hostFirstName: hostFirstName.trim(),
        hostLastName: hostLastName.trim(),
        hostEmail: hostEmail.trim(),
        hostParticipates,
        hostWishlist: hostWishlist.trim(),
      });

      onRoomCreated(room.id, room.adminToken);
    } catch (err: any) {
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
          <h2>Створити онлайн-кімнату 🎅</h2>
          <p className="card-desc">
            Створіть подію та поділіться посиланням із друзями. Кожен вкаже свої побажання, а система таємно розподілить пари та надішле листи на email.
          </p>
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
            placeholder="напр., Новорічний офіс 2026 або Друзі"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="host-first-name">
              <User size={16} />
              <span>Ваше ім'я (Організатор) *</span>
            </label>
            <input
              id="host-first-name"
              type="text"
              className="input-text"
              placeholder="Олександр"
              value={hostFirstName}
              onChange={(e) => setHostFirstName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="host-last-name">
              <User size={16} />
              <span>Ваше прізвище *</span>
            </label>
            <input
              id="host-last-name"
              type="text"
              className="input-text"
              placeholder="Щур"
              value={hostLastName}
              onChange={(e) => setHostLastName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="host-email">
            <Mail size={16} />
            <span>Ваш Email *</span>
          </label>
          <input
            id="host-email"
            type="email"
            className="input-text"
            placeholder="host@example.com"
            value={hostEmail}
            onChange={(e) => setHostEmail(e.target.value)}
            required
          />
        </div>

        {/* Modern interactive toggle card for participating */}
        <div
          className={`toggle-card ${hostParticipates ? 'active' : ''}`}
          onClick={() => setHostParticipates(!hostParticipates)}
          role="checkbox"
          aria-checked={hostParticipates}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              setHostParticipates(!hostParticipates);
            }
          }}
        >
          <div className="toggle-card-checkbox">
            {hostParticipates && <Check size={14} className="toggle-check-icon" />}
          </div>
          <div className="toggle-card-text">
            <strong>Я також беру участь у жеребкуванні</strong>
            <span>Мене буде включено до списку як дарувальника та отримувача</span>
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
              placeholder="Що ви любите, розмір, хобі або що точно НЕ варто дарувати..."
              value={hostWishlist}
              onChange={(e) => setHostWishlist(e.target.value)}
            />
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          <span>{loading ? 'Створюємо кімнату...' : 'Створити кімнату'}</span>
          <ArrowRight size={20} />
        </button>
      </form>
    </div>
  );
};
