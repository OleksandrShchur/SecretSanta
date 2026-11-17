import React from 'react';
import { Dices, Send } from 'lucide-react';
import { triggerHaptic } from '../telegram';

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
        aria-selected={activeTab === 'online'}
        className={`nav-tab ${activeTab === 'online' ? 'active' : ''}`}
        onClick={() => {
          triggerHaptic('light');
          onTabChange('online');
        }}
      >
        <Send size={18} className="tab-icon" />
        <span className="nav-tab-label">
          <span className="tab-title">Кімната в Telegram</span>
          <span className="tab-desc">Сповіщення від бота</span>
        </span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'offline'}
        className={`nav-tab ${activeTab === 'offline' ? 'active' : ''}`}
        onClick={() => {
          triggerHaptic('light');
          onTabChange('offline');
        }}
      >
        <Dices size={18} className="tab-icon" />
        <span className="nav-tab-label">
          <span className="tab-title">Швидке (Офлайн)</span>
          <span className="tab-desc">Локально на екрані</span>
        </span>
      </button>
    </nav>
  );
};
