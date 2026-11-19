import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HostDashboard } from '../HostDashboard';
import * as api from '../../api';
import type { RoomAdmin } from '../../types';

vi.mock('../../api');
vi.mock('../MyAssignmentCard', () => ({
  MyAssignmentCard: () => <div data-testid="assignment-card">Host Assignment Card</div>,
}));

describe('HostDashboard Component', () => {
  const roomId = 'room-111';
  const adminToken = 'admin-tok-123';
  const onGoHomeMock = vi.fn();

  const baseRoom: RoomAdmin = {
    id: roomId,
    title: 'Secret Santa Admin',
    hostName: 'Олександр Щур',
    hostTelegramId: 100000001,
    adminToken,
    status: 'collecting',
    createdAt: '2026-11-19T00:00:00Z',
    participants: [
      {
        id: 'p-1',
        roomId,
        firstName: 'Олександр',
        lastName: 'Щур',
        telegramId: 100000001,
        telegramUsername: 'alex_shchur',
        wishlist: 'Books',
        createdAt: '2026-11-19T00:00:00Z',
      },
      {
        id: 'p-2',
        roomId,
        firstName: 'Марія',
        lastName: 'Коваль',
        telegramId: 100000002,
        telegramUsername: 'maria_k',
        wishlist: 'Chocolates',
        createdAt: '2026-11-19T00:00:00Z',
      },
    ],
    restrictions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getTelegramConfig).mockResolvedValue({
      botUsername: 'TestBot',
      configured: true,
      appShortName: 'app',
    });
  });

  it('renders loading indicator initially', () => {
    vi.mocked(api.getRoomAdmin).mockImplementationOnce(() => new Promise(() => {}));

    render(<HostDashboard roomId={roomId} adminToken={adminToken} onGoHome={onGoHomeMock} />);

    expect(screen.getByText(/завантаження даних кімнати/i)).toBeInTheDocument();
  });

  it('renders dashboard with stats and disables shuffle when fewer than 3 participants', async () => {
    vi.mocked(api.getRoomAdmin).mockResolvedValue(baseRoom);

    render(<HostDashboard roomId={roomId} adminToken={adminToken} onGoHome={onGoHomeMock} />);

    await waitFor(() => {
      expect(screen.getByText('Secret Santa Admin')).toBeInTheDocument();
      expect(screen.getByText(/панель організатора/i)).toBeInTheDocument();
      expect(screen.getByText('Олександр Щур')).toBeInTheDocument();
      expect(screen.getByText('Марія Коваль')).toBeInTheDocument();
    });

    const shuffleBtn = screen.getByRole('button', { name: /провести жеребкування/i });
    expect(shuffleBtn).toBeDisabled();
    expect(screen.getByText(/потрібно щонайменше 3 учасники/i)).toBeInTheDocument();
  });

  it('allows copying invite link', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getRoomAdmin).mockResolvedValue(baseRoom);

    render(<HostDashboard roomId={roomId} adminToken={adminToken} onGoHome={onGoHomeMock} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /копіювати/i })).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /копіювати/i });
    await user.click(copyBtn);

    expect(screen.getByText(/скопійовано/i)).toBeInTheDocument();
  });

  it('executes shuffle successfully when 3+ participants', async () => {
    const user = userEvent.setup();
    const threeParticipantsRoom: RoomAdmin = {
      ...baseRoom,
      participants: [
        ...baseRoom.participants,
        {
          id: 'p-3',
          roomId,
          firstName: 'Іван',
          lastName: 'Петренко',
          telegramId: 100000003,
          telegramUsername: 'ivan_p',
          createdAt: '2026-11-19T00:00:00Z',
        },
      ],
    };

    vi.mocked(api.getRoomAdmin).mockResolvedValue(threeParticipantsRoom);
    vi.mocked(api.performShuffle).mockResolvedValue({
      success: true,
      totalParticipants: 3,
      notificationsSent: 3,
    });

    render(<HostDashboard roomId={roomId} adminToken={adminToken} onGoHome={onGoHomeMock} />);

    await waitFor(() => {
      expect(screen.getByText('Іван Петренко')).toBeInTheDocument();
    });

    const shuffleBtn = screen.getByRole('button', { name: /провести жеребкування/i });
    expect(shuffleBtn).not.toBeDisabled();

    await user.click(shuffleBtn);

    await waitFor(() => {
      expect(api.performShuffle).toHaveBeenCalledWith(roomId, adminToken);
      expect(screen.getByText(/жеребкування успішно проведено/i)).toBeInTheDocument();
    });
  });

  it('shows assignment card when room is shuffled', async () => {
    const shuffledRoom: RoomAdmin = {
      ...baseRoom,
      status: 'shuffled',
    };
    vi.mocked(api.getRoomAdmin).mockResolvedValue(shuffledRoom);

    render(<HostDashboard roomId={roomId} adminToken={adminToken} onGoHome={onGoHomeMock} />);

    await waitFor(() => {
      expect(screen.getByTestId('assignment-card')).toBeInTheDocument();
    });
  });
});
