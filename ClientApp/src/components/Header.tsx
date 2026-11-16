import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="christmas-header">
      <img src="/tree.svg" className="tree left" alt="Ялинка" aria-hidden="true" />
      <h1>Організатор Таємного Санти</h1>
      <img src="/tree.svg" className="tree right" alt="Ялинка" aria-hidden="true" />
    </header>
  );
};
