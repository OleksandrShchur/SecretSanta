import React from 'react';
import { Dices, Home } from 'lucide-react';

interface NavbarProps {
  activeTab: 'offline' | 'online';
  onTabChange: (tab: 'offline' | 'online') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="app-nav" aria-label="Вибір режиму">
      <button
        type="button"
        className={`nav-tab ${activeTab === 'offline' ? 'active' : ''}`}
        onClick={() => onTabChange('offline')}
      >
        <Dices size={18} className="tab-icon" />
        <span>Швидке жеребкування</span>
      </button>

      <button
        type="button"
        className={`nav-tab ${activeTab === 'online' ? 'active' : ''}`}
        onClick={() => onTabChange('online')}
      >
        <Home size={18} className="tab-icon" />
        <span>Онлайн-кімната</span>
      </button>
    </nav>
  );
};
