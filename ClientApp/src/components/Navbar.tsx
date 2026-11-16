import React from 'react';
import { Dices, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: 'offline' | 'online';
  onTabChange: (tab: 'offline' | 'online') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="app-nav" aria-label="Вибір режиму жеребкування" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'offline'}
        className={`nav-tab ${activeTab === 'offline' ? 'active' : ''}`}
        onClick={() => onTabChange('offline')}
      >
        <Dices size={18} className="tab-icon" />
        <span className="nav-tab-label">
          <span className="tab-title">Швидке (Офлайн)</span>
          <span className="tab-desc">Миттєво на місці</span>
        </span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'online'}
        className={`nav-tab ${activeTab === 'online' ? 'active' : ''}`}
        onClick={() => onTabChange('online')}
      >
        <Sparkles size={18} className="tab-icon" />
        <span className="nav-tab-label">
          <span className="tab-title">Онлайн-кімната</span>
          <span className="tab-desc">З розсилкою на email</span>
        </span>
      </button>
    </nav>
  );
};
