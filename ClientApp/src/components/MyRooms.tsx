import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Users,
  Calendar,
  Settings,
  Power,
  Trash2,
  RefreshCw,
  AlertCircle,
  MoreVertical,
  Crown,
  ExternalLink,
  Gift,
} from 'lucide-react';
import type { RoomSummary, RoomParticipation } from '../types';
import { getMyRooms, getParticipatingRooms, deactivateRoom, deleteRoom } from '../api';
import { getTelegramUser, triggerHaptic } from '../telegram';

interface MyRoomsProps {
  onOpenRoomAsHost: (roomId: string, adminToken: string) => void;
  onOpenRoomAsParticipant: (roomId: string) => void;
  onBack?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  collecting: { label: 'Реєстрація відкрита 🎅', className: 'status-pill-collecting' },
  shuffled: { label: 'Жеребкування проведено 🎉', className: 'status-pill-shuffled' },
  closed: { label: 'Деактивовано 🔒', className: 'status-pill-closed' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const MyRooms: React.FC<MyRoomsProps> = ({
  onOpenRoomAsHost,
  onOpenRoomAsParticipant,
}) => {
  const tgUser = getTelegramUser();

  const [activeTab, setActiveTab] = useState<'participant' | 'host'>('participant');
  const [hostRooms, setHostRooms] = useState<RoomSummary[]>([]);
  const [participantRooms, setParticipantRooms] = useState<RoomParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeMenuRoomId, setActiveMenuRoomId] = useState<string | null>(null);

  const fetchAllRooms = useCallback(async () => {
    try {
      const [hostData, participantData] = await Promise.all([
        getMyRooms(tgUser.id),
        getParticipatingRooms(tgUser.id),
      ]);
      setHostRooms(hostData);
      setParticipantRooms(participantData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Не вдалося завантажити кімнати');
    } finally {
      setLoading(false);
    }
  }, [tgUser.id]);

  useEffect(() => {
    fetchAllRooms();
  }, [fetchAllRooms]);

  // Click outside to close 3-dots dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.card-menu-container')) {
        setActiveMenuRoomId(null);
      }
    };
    if (activeMenuRoomId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeMenuRoomId]);

  const handleDeactivate = async (room: RoomSummary) => {
    if (!confirm(`Деактивувати кімнату «${room.title}»?\n\nКімнату буде закрито для нових учасників.`)) return;

    setActiveMenuRoomId(null);
    triggerHaptic('warning');
    setActionLoading(room.id);
    try {
      await deactivateRoom(room.id, room.adminToken);
      await fetchAllRooms();
      triggerHaptic('success');
    } catch (err: any) {
      triggerHaptic('error');
      alert('Помилка деактивації: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (room: RoomSummary) => {
    if (
      !confirm(
        `Видалити кімнату «${room.title}»?\n\n⚠️ Це видалить усіх учасників, жеребкування та всі дані кімнати назавжди!`
      )
    )
      return;

    setActiveMenuRoomId(null);
    triggerHaptic('warning');
    setActionLoading(room.id);
    try {
      await deleteRoom(room.id, room.adminToken);
      await fetchAllRooms();
      triggerHaptic('success');
    } catch (err: any) {
      triggerHaptic('error');
      alert('Помилка видалення: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleMenu = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    triggerHaptic('light');
    setActiveMenuRoomId((prev) => (prev === roomId ? null : roomId));
  };

  if (loading) {
    return (
      <div className="card loading-card">
        <RefreshCw size={28} className="spin text-gold" />
        <p>Завантаження ваших кімнат...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card alert-error" role="alert">
        <AlertCircle size={20} className="flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="card my-rooms-page-card">
      <div className="card-header">
        <FolderOpen size={24} className="text-forest flex-shrink-0" />
        <div>
          <h2>Мої кімнати</h2>
          <p className="card-desc">Кімнати, де ви берете участь або які організовуєте</p>
        </div>
      </div>

      {/* Segmented Toggle: Participant vs Host */}
      <div className="rooms-toggle-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'participant'}
          className={`rooms-toggle-tab ${activeTab === 'participant' ? 'active' : ''}`}
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('participant');
            setActiveMenuRoomId(null);
          }}
        >
          <Gift size={16} />
          <span>Я учасник ({participantRooms.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'host'}
          className={`rooms-toggle-tab ${activeTab === 'host' ? 'active' : ''}`}
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('host');
            setActiveMenuRoomId(null);
          }}
        >
          <Crown size={16} />
          <span>Я організатор ({hostRooms.length})</span>
        </button>
      </div>

      {/* Content for Participant tab */}
      {activeTab === 'participant' && (
        <div className="my-rooms-list">
          {participantRooms.length === 0 ? (
            <div className="rooms-empty-box">
              <Gift size={36} className="text-muted mx-auto" />
              <p className="empty-state">
                Ви ще не берете участь у жодній кімнаті.
              </p>
              <span className="empty-subtext">
                Перейдіть за посиланням-запрошенням від друзів, щоб зареєструватися.
              </span>
            </div>
          ) : (
            participantRooms.map((room) => {
              const statusCfg = STATUS_CONFIG[room.status] || STATUS_CONFIG.collecting;
              const isMenuOpen = activeMenuRoomId === room.id;

              return (
                <div
                  key={room.id}
                  className="my-room-item clickable"
                  onClick={() => onOpenRoomAsParticipant(room.id)}
                >
                  <div className="my-room-top">
                    <div className="my-room-info">
                      <strong className="my-room-title">{room.title}</strong>
                      <span className={`status-pill status-pill-sm ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* 3-dots Menu */}
                    <div className="card-menu-container">
                      <button
                        type="button"
                        className="btn-card-menu"
                        onClick={(e) => toggleMenu(e, room.id)}
                        aria-label="Дії з кімнатою"
                        title="Дії"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {isMenuOpen && (
                        <div className="card-menu-dropdown animate-fade-in" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="card-menu-item"
                            onClick={() => {
                              setActiveMenuRoomId(null);
                              onOpenRoomAsParticipant(room.id);
                            }}
                          >
                            <ExternalLink size={15} />
                            <span>Відкрити кімнату</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="my-room-meta">
                    <span className="my-room-meta-item">
                      <Crown size={13} className="text-gold" />
                      Організатор: {room.hostName}
                    </span>
                    <span className="my-room-meta-item">
                      <Users size={13} />
                      {room.participantCount} учасн.
                    </span>
                    <span className="my-room-meta-item">
                      <Calendar size={13} />
                      {formatDate(room.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Content for Host tab */}
      {activeTab === 'host' && (
        <div className="my-rooms-list">
          {hostRooms.length === 0 ? (
            <div className="rooms-empty-box">
              <Crown size={36} className="text-muted mx-auto" />
              <p className="empty-state">
                Ви ще не створили жодної кімнати.
              </p>
              <span className="empty-subtext">
                Створіть свою першу подію на головному екрані додатку!
              </span>
            </div>
          ) : (
            hostRooms.map((room) => {
              const statusCfg = STATUS_CONFIG[room.status] || STATUS_CONFIG.collecting;
              const isMenuOpen = activeMenuRoomId === room.id;
              const isLoading = actionLoading === room.id;

              return (
                <div key={room.id} className="my-room-item">
                  <div className="my-room-top">
                    <div className="my-room-info">
                      <strong className="my-room-title">{room.title}</strong>
                      <span className={`status-pill status-pill-sm ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* 3-dots Menu */}
                    <div className="card-menu-container">
                      <button
                        type="button"
                        className="btn-card-menu"
                        onClick={(e) => toggleMenu(e, room.id)}
                        disabled={isLoading}
                        aria-label="Дії з кімнатою"
                        title="Дії"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {isMenuOpen && (
                        <div className="card-menu-dropdown animate-fade-in" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="card-menu-item"
                            onClick={() => {
                              setActiveMenuRoomId(null);
                              onOpenRoomAsHost(room.id, room.adminToken);
                            }}
                          >
                            <Settings size={15} />
                            <span>Керувати</span>
                          </button>

                          {room.status === 'collecting' && (
                            <button
                              type="button"
                              className="card-menu-item card-menu-item-warning"
                              onClick={() => handleDeactivate(room)}
                            >
                              <Power size={15} />
                              <span>Деактивувати</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="card-menu-item card-menu-item-danger"
                            onClick={() => handleDelete(room)}
                          >
                            <Trash2 size={15} />
                            <span>Видалити</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="my-room-meta">
                    <span className="my-room-meta-item">
                      <Users size={13} />
                      {room.participantCount} учасн.
                    </span>
                    <span className="my-room-meta-item">
                      <Calendar size={13} />
                      {formatDate(room.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
