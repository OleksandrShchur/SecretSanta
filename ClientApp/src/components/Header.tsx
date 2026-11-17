import React, { useState, useEffect, useRef } from 'react';
import { Settings, FolderOpen } from 'lucide-react';
import { getTelegramUser, triggerHaptic } from '../telegram';
import type { TelegramUser } from '../types';

interface HeaderProps {
  onGoHome?: () => void;
  onOpenMyRooms?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onGoHome, onOpenMyRooms }) => {
  const [currentUser, setCurrentUser] = useState<TelegramUser>(getTelegramUser());
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUserChange = () => {
      setCurrentUser(getTelegramUser());
    };
    window.addEventListener('tg_user_changed', handleUserChange);
    return () => window.removeEventListener('tg_user_changed', handleUserChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const displayName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ');

  return (
    <header className="christmas-header">
      {/* Settings / Menu Gear Button */}
      <div className="header-menu-container" ref={menuRef}>
        <button
          type="button"
          className={`btn-header-gear ${showMenu ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('light');
            setShowMenu(!showMenu);
          }}
          aria-label="Меню"
          title="Меню"
        >
          <Settings size={18} />
        </button>

        {showMenu && (
          <div className="header-menu-dropdown animate-fade-in">
            <button
              type="button"
              className="header-menu-item"
              onClick={() => {
                triggerHaptic('light');
                setShowMenu(false);
                onOpenMyRooms?.();
              }}
            >
              <FolderOpen size={16} className="text-forest" />
              <span>Мої кімнати</span>
            </button>
          </div>
        )}
      </div>

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
      </div>
    </header>
  );
};
