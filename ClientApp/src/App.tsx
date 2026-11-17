import React, { useState, useEffect } from 'react';
import Snowfall from 'react-snowfall';
import { ArrowLeft } from 'lucide-react';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { OfflineGenerator } from './components/OfflineGenerator';
import { CreateRoom } from './components/CreateRoom';
import { MyRooms } from './components/MyRooms';
import { HostDashboard } from './components/HostDashboard';
import { JoinRoom } from './components/JoinRoom';
import { initTelegramApp, getTelegramStartParam, triggerHaptic } from './telegram';
import './App.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'offline' | 'online'>('online');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentAdminToken, setCurrentAdminToken] = useState<string | null>(null);
  const [showMyRooms, setShowMyRooms] = useState(false);

  useEffect(() => {
    initTelegramApp();

    const startParam = getTelegramStartParam();
    const params = new URLSearchParams(window.location.search);
    const admin = params.get('admin');
    const tab = params.get('tab');

    if (startParam && admin) {
      setCurrentRoomId(startParam);
      setCurrentAdminToken(admin);
      setShowMyRooms(false);
      setActiveTab('online');
    } else if (startParam) {
      setCurrentRoomId(startParam);
      setShowMyRooms(false);
      setActiveTab('online');
    } else if (tab === 'offline') {
      setActiveTab('offline');
    } else {
      setActiveTab('online');
    }
  }, []);

  const handleTabChange = (tab: 'offline' | 'online') => {
    setActiveTab(tab);
    setCurrentRoomId(null);
    setCurrentAdminToken(null);
    setShowMyRooms(false);
    const url = new URL(window.location.href);
    url.search = tab === 'offline' ? '?tab=offline' : '';
    window.history.pushState({}, '', url.toString());
  };

  const handleGoHome = () => {
    triggerHaptic('light');
    setCurrentRoomId(null);
    setCurrentAdminToken(null);
    setShowMyRooms(false);
    const url = new URL(window.location.href);
    url.search = activeTab === 'offline' ? '?tab=offline' : '';
    window.history.pushState({}, '', url.toString());
  };

  const handleRoomCreated = (roomId: string, adminToken: string) => {
    setCurrentRoomId(roomId);
    setCurrentAdminToken(adminToken);
    setShowMyRooms(false);
    const url = new URL(window.location.href);
    url.search = `?room=${roomId}&admin=${adminToken}`;
    window.history.pushState({}, '', url.toString());
  };

  const handleOpenRoomAsHost = (roomId: string, adminToken: string) => {
    setCurrentRoomId(roomId);
    setCurrentAdminToken(adminToken);
    setShowMyRooms(false);
    const url = new URL(window.location.href);
    url.search = `?room=${roomId}&admin=${adminToken}`;
    window.history.pushState({}, '', url.toString());
  };

  const handleOpenRoomAsParticipant = (roomId: string) => {
    setCurrentRoomId(roomId);
    setCurrentAdminToken(null);
    setShowMyRooms(false);
    const url = new URL(window.location.href);
    url.search = `?room=${roomId}`;
    window.history.pushState({}, '', url.toString());
  };

  const handleOpenMyRooms = () => {
    triggerHaptic('light');
    setShowMyRooms(true);
    setCurrentRoomId(null);
    setCurrentAdminToken(null);
  };

  const renderContent = () => {
    if (showMyRooms) {
      return (
        <MyRooms
          onOpenRoomAsHost={handleOpenRoomAsHost}
          onOpenRoomAsParticipant={handleOpenRoomAsParticipant}
          onBack={handleGoHome}
        />
      );
    }

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
    <>
      <Snowfall
        style={{
          position: 'fixed',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          zIndex: 50,
          pointerEvents: 'none',
        }}
        snowflakeCount={150}
      />
      <div className="app-container">
        <Header
          onGoHome={currentRoomId || showMyRooms ? handleGoHome : undefined}
          onOpenMyRooms={handleOpenMyRooms}
        />
        <main className="main-content">
          {!currentRoomId && !showMyRooms ? (
            <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
          ) : (
            <div className="room-nav-bar">
              <button
                type="button"
                className="btn-nav-back"
                onClick={handleGoHome}
                aria-label="Повернутися на головну"
              >
                <ArrowLeft size={16} />
                <span>На головну</span>
              </button>
              <span className="room-nav-pill">
                {showMyRooms
                  ? '📁 Мої кімнати'
                  : currentAdminToken
                  ? '👑 Панель організатора'
                  : '🎁 Кімната учасника'}
              </span>
            </div>
          )}
          {renderContent()}
        </main>

        <footer className="christmas-footer">
          <p>Telegram Mini App 🎅🎄 | Організатор Таємного Санти</p>
        </footer>
      </div>
    </>
  );
};

export default App;
