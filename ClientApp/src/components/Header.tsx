import React, { useState, useEffect } from 'react';
import { getTelegramUser, setMockTelegramUser, isInsideTelegram } from '../telegram';
import type { TelegramUser } from '../types';

interface HeaderProps {
  onGoHome?: () => void;
}

const PRESET_MOCK_USERS: TelegramUser[] = [
  { id: 100000001, first_name: 'Олександр', last_name: 'Щур', username: 'alex_shchur' },
  { id: 100000002, first_name: 'Марія', last_name: 'Коваль', username: 'maria_k' },
  { id: 100000003, first_name: 'Іван', last_name: 'Петренко', username: 'ivan_p' },
  { id: 100000004, first_name: 'Олена', last_name: 'Мельник', username: 'olena_m' },
];

export const Header: React.FC<HeaderProps> = ({ onGoHome }) => {
  const [currentUser, setCurrentUser] = useState<TelegramUser>(getTelegramUser());
  const [inTelegram] = useState(isInsideTelegram());
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);

  useEffect(() => {
    const handleUserChange = () => {
      setCurrentUser(getTelegramUser());
    };
    window.addEventListener('tg_user_changed', handleUserChange);
    return () => window.removeEventListener('tg_user_changed', handleUserChange);
  }, []);

  const handleSelectMock = (user: TelegramUser) => {
    setMockTelegramUser(user);
    setShowUserSwitcher(false);
  };

  const displayName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ');

  return (
    <header className="christmas-header">
      <div
        className={`header-main-content ${onGoHome ? 'is-clickable' : ''}`}
        onClick={onGoHome}
        title={onGoHome ? 'На головну' : undefined}
        role={onGoHome ? 'button' : undefined}
        tabIndex={onGoHome ? 0 : undefined}
        onKeyDown={(e) => {
          if (onGoHome && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onGoHome();
          }
        }}
      >
        <img src="/tree.svg" className="tree left" alt="Ялинка" aria-hidden="true" />
        <div className="header-title-wrap">
          <h1>Таємний Санта</h1>
          <p className="header-subtitle">Telegram Mini App 🎅🎁</p>
        </div>
        <img src="/tree.svg" className="tree right" alt="Ялинка" aria-hidden="true" />
      </div>

      {/* User Status Bar */}
      <div className="header-tg-bar">
        <div className="tg-active-chip">
          <span className="tg-dot" aria-hidden="true"></span>
          <span className="tg-name">
            {displayName} {currentUser.username ? `(@${currentUser.username})` : `(ID: ${currentUser.id})`}
          </span>
        </div>

        {!inTelegram && (
          <div className="dev-mock-switcher">
            <button
              type="button"
              className="btn-mock-toggle"
              onClick={() => setShowUserSwitcher(!showUserSwitcher)}
              title="Перемкнути тестового користувача для емуляції іншого учасника"
            >
              🛠️ Тест: змінити користувача
            </button>

            {showUserSwitcher && (
              <div className="dev-mock-dropdown">
                <span className="dropdown-title">Оберіть тестового користувача:</span>
                {PRESET_MOCK_USERS.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className={`mock-user-item ${u.id === currentUser.id ? 'active' : ''}`}
                    onClick={() => handleSelectMock(u)}
                  >
                    <strong>{u.first_name} {u.last_name}</strong>
                    <span>@{u.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
