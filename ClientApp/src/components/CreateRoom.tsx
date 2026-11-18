import React, { useState } from 'react';
import { Sparkles, User, Gift, AlertCircle, ArrowRight, Check, Send } from 'lucide-react';
import { createRoom } from '../api';
import { getTelegramUser, triggerHaptic } from '../telegram';
import { FloatingInput, FloatingTextarea } from './FloatingInput';

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

  // Field validation state
  const [errors, setErrors] = useState<{
    title?: string;
    hostFirstName?: string;
  }>({});
  const [touched, setTouched] = useState<{
    title?: boolean;
    hostFirstName?: boolean;
  }>({});

  const validateTitle = (val: string): string | undefined => {
    if (!val.trim()) {
      return "Вкажіть назву кімнати (напр., «Новорічний офіс»)";
    }
    if (val.trim().length > 100) {
      return "Назва кімнати не може перевищувати 100 символів";
    }
    return undefined;
  };

  const validateFirstName = (val: string): string | undefined => {
    if (!val.trim()) {
      return "Вкажіть ваше ім'я";
    }
    if (val.trim().length > 50) {
      return "Ім'я не може перевищувати 50 символів";
    }
    return undefined;
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (touched.title) {
      setErrors((prev) => ({ ...prev, title: validateTitle(val) }));
    }
  };

  const handleTitleBlur = () => {
    setTouched((prev) => ({ ...prev, title: true }));
    setErrors((prev) => ({ ...prev, title: validateTitle(title) }));
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHostFirstName(val);
    if (touched.hostFirstName) {
      setErrors((prev) => ({ ...prev, hostFirstName: validateFirstName(val) }));
    }
  };

  const handleFirstNameBlur = () => {
    setTouched((prev) => ({ ...prev, hostFirstName: true }));
    setErrors((prev) => ({ ...prev, hostFirstName: validateFirstName(hostFirstName) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const titleErr = validateTitle(title);
    const firstNameErr = validateFirstName(hostFirstName);

    setTouched({ title: true, hostFirstName: true });
    setErrors({ title: titleErr, hostFirstName: firstNameErr });

    if (titleErr || firstNameErr) {
      triggerHaptic('warning');
      if (titleErr) {
        document.getElementById('room-title')?.focus();
      } else if (firstNameErr) {
        document.getElementById('host-first-name')?.focus();
      }
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

      {errorMsg && (
        <div className="alert-error" role="alert">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="room-form" noValidate>
        <FloatingInput
          id="room-title"
          label="Назва кімнати або події"
          placeholder="напр., Новорічний офіс 2026 або Сім'я"
          icon={<Sparkles size={16} />}
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          error={touched.title ? errors.title : undefined}
          required
        />

        <div className="form-row">
          <FloatingInput
            id="host-first-name"
            label="Ваше ім'я"
            placeholder="Ім'я"
            icon={<User size={16} />}
            value={hostFirstName}
            onChange={handleFirstNameChange}
            onBlur={handleFirstNameBlur}
            error={touched.hostFirstName ? errors.hostFirstName : undefined}
            required
          />

          <FloatingInput
            id="host-last-name"
            label="Прізвище (опціонально)"
            placeholder="Прізвище"
            icon={<User size={16} />}
            value={hostLastName}
            onChange={(e) => setHostLastName(e.target.value)}
          />
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
          <div className="animate-fade-in">
            <FloatingTextarea
              id="host-wishlist"
              label="Ваші побажання до подарунка (опціонально)"
              placeholder="Що ви любите, захоплення, розмір або що краще НЕ дарувати..."
              icon={<Gift size={16} />}
              value={hostWishlist}
              onChange={(e) => setHostWishlist(e.target.value)}
              rows={3}
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
