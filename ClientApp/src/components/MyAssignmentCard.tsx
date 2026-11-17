import React, { useState, useEffect } from 'react';
import { Gift, Sparkles, Eye, EyeOff, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react';
import type { MyAssignment } from '../types';
import { getMyAssignment } from '../api';
import { triggerHaptic } from '../telegram';

interface MyAssignmentCardProps {
  roomId: string;
  telegramId: number;
}

export const MyAssignmentCard: React.FC<MyAssignmentCardProps> = ({ roomId, telegramId }) => {
  const [assignment, setAssignment] = useState<MyAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    getMyAssignment(roomId, telegramId)
      .then((data) => {
        setAssignment(data);
        setErrorMsg(null);
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Не вдалося отримати підопічного');
      })
      .finally(() => setLoading(false));
  }, [roomId, telegramId]);

  if (loading) {
    return (
      <div className="assignment-card loading">
        <RefreshCw size={24} className="spin text-gold mx-auto" />
        <p>Завантаження результатів жеребкування...</p>
      </div>
    );
  }

  if (errorMsg || !assignment) {
    return (
      <div className="assignment-card error">
        <AlertCircle size={24} className="text-danger flex-shrink-0" />
        <p>{errorMsg || 'Призначення не знайдено'}</p>
      </div>
    );
  }

  const toggleReveal = () => {
    triggerHaptic(isRevealed ? 'light' : 'success');
    setIsRevealed(!isRevealed);
  };

  const recipientFullName = `${assignment.receiverFirstName} ${assignment.receiverLastName}`.trim();
  const recipientUsername = assignment.receiverUsername
    ? `@${assignment.receiverUsername.replace(/^@/, '')}`
    : null;

  return (
    <div className={`assignment-reveal-box ${isRevealed ? 'revealed' : 'sealed'}`}>
      <div className="reveal-badge">
        <Sparkles size={16} />
        <span>Ваш результат жеребкування</span>
      </div>

      {!isRevealed ? (
        <div className="sealed-content" onClick={toggleReveal} role="button" tabIndex={0}>
          <div className="gift-pulse-icon">
            <Gift size={48} className="text-gold" />
          </div>
          <h3>Таємниця готова до розкриття! 🎁</h3>
          <p className="sealed-hint">
            Натисніть на картку, щоб дізнатися, кому ви даруватимете подарунок у кімнаті «{assignment.roomTitle}».
          </p>
          <button type="button" className="btn btn-gold btn-reveal" onClick={(e) => { e.stopPropagation(); toggleReveal(); }}>
            <Eye size={18} />
            <span>Розкрити мого підопічного 🎄</span>
          </button>
        </div>
      ) : (
        <div className="revealed-content animate-fade-in">
          <div className="revealed-header">
            <span className="label-sub">Ви даруєте подарунок для:</span>
            <h2 className="recipient-name">🎅 {recipientFullName}</h2>
            {recipientUsername && (
              <a
                href={`https://t.me/${recipientUsername.replace(/^@/, '')}`}
                target="_blank"
                rel="noreferrer"
                className="recipient-telegram-link"
              >
                <MessageCircle size={16} />
                <span>{recipientUsername}</span>
              </a>
            )}
          </div>

          <div className="wishlist-highlight">
            <div className="wishlist-header">
              <Gift size={18} className="text-gold" />
              <strong>Побажання до подарунка:</strong>
            </div>
            {assignment.receiverWishlist ? (
              <p className="wishlist-text">
                «{assignment.receiverWishlist}»
              </p>
            ) : (
              <p className="wishlist-text empty">
                (Підопічний не залишив побажань — оберіть подарунок на власний смак від щирого серця! 🎄✨)
              </p>
            )}
          </div>

          <p className="secret-reminder">
            🤫 <strong>Секрет:</strong> не розповідайте нікому до святкування!
          </p>

          <button type="button" className="btn btn-secondary btn-sm btn-hide mt-3" onClick={toggleReveal}>
            <EyeOff size={16} />
            <span>Сховати підопічного (захист від очей)</span>
          </button>
        </div>
      )}
    </div>
  );
};
