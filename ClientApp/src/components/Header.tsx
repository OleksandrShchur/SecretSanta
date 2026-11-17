import React from 'react';

interface HeaderProps {
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onGoHome }) => {
  return (
    <header
      className={`christmas-header ${onGoHome ? 'is-clickable' : ''}`}
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
        <p className="header-subtitle">Святковий розподіл подарунків 🎅🎁</p>
      </div>
      <img src="/tree.svg" className="tree right" alt="Ялинка" aria-hidden="true" />
    </header>
  );
};
