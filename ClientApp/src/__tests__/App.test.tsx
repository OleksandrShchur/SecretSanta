import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from '../App';
import * as api from '../api';

vi.mock('../api');

describe('App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('renders default online view with CreateRoom and Navbar', () => {
    render(<App />);

    expect(screen.getByText(/таємний санта/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /створити кімнату в telegram/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /кімната в telegram/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /швидке \(офлайн\)/i })).toBeInTheDocument();
  });

  it('switches between Online and Offline modes when clicking navbar tabs', async () => {
    const user = userEvent.setup();
    render(<App />);

    const offlineTab = screen.getByRole('tab', { name: /швидке \(офлайн\)/i });
    await user.click(offlineTab);

    expect(screen.getByText('Швидке жеребкування на місці')).toBeInTheDocument();

    const onlineTab = screen.getByRole('tab', { name: /кімната в telegram/i });
    await user.click(onlineTab);

    expect(screen.getByRole('heading', { name: /створити кімнату в telegram/i })).toBeInTheDocument();
  });

  it('renders JoinRoom view when URL contains room parameter', async () => {
    window.history.pushState({}, '', '/?room=room-uuid-123');

    vi.mocked(api.getRoom).mockResolvedValue({
      id: 'room-uuid-123',
      title: 'Shared Office Room',
      hostName: 'Admin Santa',
      status: 'collecting',
      participantCount: 1,
      createdAt: '2026-11-19T00:00:00Z',
      participants: [{ id: '1', firstName: 'Admin', lastName: 'Santa' }],
      myRegistration: null,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Shared Office Room')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /взяти участь у таємному санті/i })).toBeInTheDocument();
    });
  });

  it('renders HostDashboard view when URL contains room and admin parameter', async () => {
    window.history.pushState({}, '', '/?room=room-uuid-123&admin=admin-secret-token');

    vi.mocked(api.getRoomAdmin).mockResolvedValue({
      id: 'room-uuid-123',
      title: 'Admin Controlled Room',
      hostName: 'Олександр Щур',
      hostTelegramId: 100000001,
      adminToken: 'admin-secret-token',
      status: 'collecting',
      createdAt: '2026-11-19T00:00:00Z',
      participants: [],
      restrictions: [],
    });
    vi.mocked(api.getTelegramConfig).mockResolvedValue({
      botUsername: 'SantaBot',
      configured: true,
      appShortName: 'app',
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Admin Controlled Room')).toBeInTheDocument();
      expect(screen.getByText(/панель організатора/i)).toBeInTheDocument();
    });
  });

  it('renders MyRooms view when URL contains view=my-rooms', async () => {
    window.history.pushState({}, '', '/?view=my-rooms');

    vi.mocked(api.getMyRooms).mockResolvedValue([]);
    vi.mocked(api.getParticipatingRooms).mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/мої кімнати/i)).toBeInTheDocument();
    });
  });
});
