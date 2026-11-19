import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JoinRoom } from '../JoinRoom';
import * as api from '../../api';
import type { RoomPublic } from '../../types';

vi.mock('../../api');
vi.mock('../MyAssignmentCard', () => ({
  MyAssignmentCard: ({ roomId }: { roomId: string }) => (
    <div data-testid="assignment-card">Assignment for {roomId}</div>
  ),
}));

describe('JoinRoom Component', () => {
  const roomId = 'room-abc-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(api.getRoom).mockImplementationOnce(() => new Promise(() => {}));

    render(<JoinRoom roomId={roomId} />);

    expect(screen.getByText(/завантаження інформації про кімнату/i)).toBeInTheDocument();
  });

  it('renders error message when room not found', async () => {
    vi.mocked(api.getRoom).mockRejectedValue(new Error('Кімнату не знайдено'));

    render(<JoinRoom roomId={roomId} />);

    await waitFor(() => {
      expect(screen.getByText('Кімнату не знайдено')).toBeInTheDocument();
    });
  });

  it('renders join form for unregistered user and allows joining', async () => {
    const user = userEvent.setup();
    const mockRoom: RoomPublic = {
      id: roomId,
      title: 'Christmas Party',
      hostName: 'Олександр Щур',
      status: 'collecting',
      participantCount: 1,
      createdAt: '2026-11-19T00:00:00Z',
      participants: [
        { id: '1', firstName: 'Марія', lastName: 'Коваль' },
      ],
      myRegistration: null,
    };

    vi.mocked(api.getRoom).mockResolvedValue(mockRoom);
    vi.mocked(api.addParticipant).mockResolvedValue({
      id: 'p-3',
      roomId,
      firstName: 'Олександр',
      lastName: 'Щур',
      telegramId: 100000001,
      createdAt: '2026-11-19T00:00:00Z',
    });

    render(<JoinRoom roomId={roomId} />);

    await waitFor(() => {
      expect(screen.getByText('Christmas Party')).toBeInTheDocument();
      expect(screen.getByText(/організатор:/i)).toBeInTheDocument();
      expect(screen.getByText(/учасники кімнати/i)).toBeInTheDocument();
    });

    const wishlistInput = screen.getByLabelText(/побажання до подарунка/i);
    await user.type(wishlistInput, 'Coffee mug');

    const joinBtn = screen.getByRole('button', { name: /взяти участь у таємному санті/i });
    await user.click(joinBtn);

    await waitFor(() => {
      expect(api.addParticipant).toHaveBeenCalledWith(
        roomId,
        expect.objectContaining({
          firstName: 'Олександр',
          wishlist: 'Coffee mug',
        })
      );
    });
  });

  it('renders registered status card when user is already registered', async () => {
    const mockRoom: RoomPublic = {
      id: roomId,
      title: 'Christmas Party',
      hostName: 'Олександр Щур',
      status: 'collecting',
      participantCount: 3,
      createdAt: '2026-11-19T00:00:00Z',
      participants: [],
      myRegistration: {
        id: 'p-1',
        firstName: 'Олександр',
        lastName: 'Щур',
        wishlist: 'Теплий шарф',
      },
    };

    vi.mocked(api.getRoom).mockResolvedValue(mockRoom);

    render(<JoinRoom roomId={roomId} />);

    await waitFor(() => {
      expect(screen.getByText(/ви берете участь у грі/i)).toBeInTheDocument();
      expect(screen.getByText('«Теплий шарф»')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /змінити дані/i })).toBeInTheDocument();
    });
  });

  it('renders assignment card when room is shuffled', async () => {
    const mockRoom: RoomPublic = {
      id: roomId,
      title: 'Christmas Party',
      hostName: 'Олександр Щур',
      status: 'shuffled',
      participantCount: 3,
      createdAt: '2026-11-19T00:00:00Z',
      participants: [],
      myRegistration: {
        id: 'p-1',
        firstName: 'Олександр',
        lastName: 'Щур',
        wishlist: 'Шарф',
      },
    };

    vi.mocked(api.getRoom).mockResolvedValue(mockRoom);

    render(<JoinRoom roomId={roomId} />);

    await waitFor(() => {
      expect(screen.getByTestId('assignment-card')).toBeInTheDocument();
    });
  });
});
