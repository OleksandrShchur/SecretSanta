import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { OfflineGenerator } from './components/OfflineGenerator';
import { CreateRoom } from './components/CreateRoom';
import { HostDashboard } from './components/HostDashboard';
import { JoinRoom } from './components/JoinRoom';
import './App.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'offline' | 'online'>('offline');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentAdminToken, setCurrentAdminToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    const admin = params.get('admin');
    const tab = params.get('tab');

    if (room && admin) {
      setCurrentRoomId(room);
      setCurrentAdminToken(admin);
      setActiveTab('online');
    } else if (room) {
      setCurrentRoomId(room);
      setActiveTab('online');
    } else if (tab === 'online') {
      setActiveTab('online');
    }
  }, []);

  const handleTabChange = (tab: 'offline' | 'online') => {
    setActiveTab(tab);
    setCurrentRoomId(null);
    setCurrentAdminToken(null);
    const url = new URL(window.location.href);
    url.search = tab === 'online' ? '?tab=online' : '';
    window.history.pushState({}, '', url.toString());
  };

  const handleGoHome = () => {
    setCurrentRoomId(null);
    setCurrentAdminToken(null);
    const url = new URL(window.location.href);
    url.search = activeTab === 'online' ? '?tab=online' : '';
    window.history.pushState({}, '', url.toString());
  };

  const handleRoomCreated = (roomId: string, adminToken: string) => {
    setCurrentRoomId(roomId);
    setCurrentAdminToken(adminToken);
    const url = new URL(window.location.href);
    url.search = `?tab=online&room=${roomId}&admin=${adminToken}`;
    window.history.pushState({}, '', url.toString());
  };

  const renderContent = () => {
    if (activeTab === 'online') {
      if (currentRoomId && currentAdminToken) {
        return (
          <HostDashboard
            roomId={currentRoomId}
            adminToken={currentAdminToken}
            onGoHome={handleGoHome}
          />
        );
      }
      if (currentRoomId) {
        return <JoinRoom roomId={currentRoomId} onGoHome={handleGoHome} />;
      }
      return <CreateRoom onRoomCreated={handleRoomCreated} />;
    }

    return <OfflineGenerator />;
  };

  return (
    <div className="app-container">
      <Header onGoHome={currentRoomId ? handleGoHome : undefined} />
      <main className="main-content">
        {!currentRoomId ? (
          <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
        ) : (
          <div className="room-nav-bar">
            <button
              type="button"
              className="btn-nav-back"
              onClick={handleGoHome}
              aria-label="Повернутися до вибору режимів"
            >
              <ArrowLeft size={16} />
              <span>Всі режими</span>
            </button>
            <span className="room-nav-pill">
              {currentAdminToken ? '👑 Панель організатора' : '🎁 Кімната учасника'}
            </span>
          </div>
        )}
        {renderContent()}
      </main>

      <footer className="christmas-footer">
        <p>З любов'ю до новорічних свят 🎅🎄 | Організатор Таємного Санти</p>
      </footer>
    </div>
  );
};

export default App;
