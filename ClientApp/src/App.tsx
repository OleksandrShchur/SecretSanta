import React, { useState, useEffect, useCallback, useRef } from 'react';
import Snowfall from 'react-snowfall';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { OfflineGenerator } from './components/OfflineGenerator';
import { CreateRoom } from './components/CreateRoom';
import { MyRooms } from './components/MyRooms';
import { HostDashboard } from './components/HostDashboard';
import { JoinRoom } from './components/JoinRoom';
import {
  initTelegramApp,
  getTelegramStartParam,
  clearTelegramStartParam,
  triggerHaptic,
  showTelegramBackButton,
  hideTelegramBackButton,
} from './telegram';
import './App.css';

function getInitialRouteState() {
  if (typeof window === 'undefined') {
    return {
      activeTab: 'online' as const,
      currentRoomId: null as string | null,
      currentAdminToken: null as string | null,
      showMyRooms: false,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const startParam = getTelegramStartParam();
  const admin = params.get('admin');
  const view = params.get('view');
  const tab = params.get('tab');
  const rawRoom = params.get('room');
  const room =
    (rawRoom ? (rawRoom.startsWith('room_') ? rawRoom.replace('room_', '') : rawRoom) : null) ||
    (!view && startParam ? startParam : null);

  if (view === 'my-rooms') {
    return { activeTab: 'online' as const, currentRoomId: null, currentAdminToken: null, showMyRooms: true };
  }
  if (room && admin) {
    return { activeTab: 'online' as const, currentRoomId: room, currentAdminToken: admin, showMyRooms: false };
  }
  if (room) {
    return { activeTab: 'online' as const, currentRoomId: room, currentAdminToken: null, showMyRooms: false };
  }
  return {
    activeTab: (tab === 'offline' ? 'offline' : 'online') as 'offline' | 'online',
    currentRoomId: null,
    currentAdminToken: null,
    showMyRooms: false,
  };
}

export const App: React.FC = () => {
  const [initialRoute] = useState(getInitialRouteState);
  const [activeTab, setActiveTab] = useState<'offline' | 'online'>(initialRoute.activeTab);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(initialRoute.currentRoomId);
  const [currentAdminToken, setCurrentAdminToken] = useState<string | null>(initialRoute.currentAdminToken);
  const [showMyRooms, setShowMyRooms] = useState(initialRoute.showMyRooms);

  const internalNavCount = useRef(0);

  const syncStateFromUrl = useCallback(() => {
    const next = getInitialRouteState();
    setActiveTab(next.activeTab);
    setCurrentRoomId(next.currentRoomId);
    setCurrentAdminToken(next.currentAdminToken);
    setShowMyRooms(next.showMyRooms);
  }, []);

  useEffect(() => {
    initTelegramApp();
    syncStateFromUrl();

    const handlePopState = () => {
      internalNavCount.current = Math.max(0, internalNavCount.current - 1);
      syncStateFromUrl();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      hideTelegramBackButton();
    };
  }, [syncStateFromUrl]);

  const handleGoHome = useCallback((replace = false) => {
    triggerHaptic('light');
    clearTelegramStartParam();
    internalNavCount.current = 0;
    const url = new URL(window.location.href);
    url.search = activeTab === 'offline' ? '?tab=offline' : '';
    if (replace) {
      window.history.replaceState({}, '', url.toString());
    } else {
      window.history.pushState({}, '', url.toString());
    }
    syncStateFromUrl();
  }, [activeTab, syncStateFromUrl]);

  const handleBack = useCallback(() => {
    triggerHaptic('light');
    if (internalNavCount.current > 0) {
      internalNavCount.current = Math.max(0, internalNavCount.current - 1);
      window.history.back();
    } else {
      handleGoHome(false);
    }
  }, [handleGoHome]);

  // Sync Telegram native back button
  useEffect(() => {
    if (currentRoomId || showMyRooms) {
      showTelegramBackButton(handleBack);
    } else {
      hideTelegramBackButton();
    }
  }, [currentRoomId, showMyRooms, handleBack]);

  const handleTabChange = (tab: 'offline' | 'online') => {
    internalNavCount.current++;
    const url = new URL(window.location.href);
    url.search = tab === 'offline' ? '?tab=offline' : '';
    window.history.pushState({}, '', url.toString());
    syncStateFromUrl();
  };

  const handleRoomCreated = (roomId: string, adminToken: string) => {
    internalNavCount.current++;
    const url = new URL(window.location.href);
    url.search = `?room=${roomId}&admin=${adminToken}`;
    window.history.pushState({}, '', url.toString());
    syncStateFromUrl();
  };

  const handleOpenRoomAsHost = (roomId: string, adminToken: string) => {
    internalNavCount.current++;
    const url = new URL(window.location.href);
    url.search = `?room=${roomId}&admin=${adminToken}`;
    window.history.pushState({}, '', url.toString());
    syncStateFromUrl();
  };

  const handleOpenRoomAsParticipant = (roomId: string) => {
    internalNavCount.current++;
    const url = new URL(window.location.href);
    url.search = `?room=${roomId}`;
    window.history.pushState({}, '', url.toString());
    syncStateFromUrl();
  };

  const handleOpenMyRooms = () => {
    triggerHaptic('light');
    internalNavCount.current++;
    const url = new URL(window.location.href);
    url.search = '?view=my-rooms';
    window.history.pushState({}, '', url.toString());
    syncStateFromUrl();
  };

  const renderContent = () => {
    if (showMyRooms) {
      return (
        <MyRooms
          onOpenRoomAsHost={handleOpenRoomAsHost}
          onOpenRoomAsParticipant={handleOpenRoomAsParticipant}
          onBack={handleBack}
        />
      );
    }

    if (activeTab === 'online') {
      if (currentRoomId && currentAdminToken) {
        return (
          <HostDashboard
            roomId={currentRoomId}
            adminToken={currentAdminToken}
            onGoHome={() => handleGoHome(true)}
          />
        );
      }
      if (currentRoomId) {
        return <JoinRoom roomId={currentRoomId} onGoHome={() => handleGoHome(false)} />;
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
          onBack={currentRoomId || showMyRooms ? handleBack : undefined}
          onGoHome={() => handleGoHome(false)}
          onOpenMyRooms={handleOpenMyRooms}
        />
        <main className="main-content">
          {!currentRoomId && !showMyRooms && (
            <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
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
