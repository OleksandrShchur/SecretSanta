import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyRooms } from '../MyRooms';
import * as api from '../../api';
import type { RoomSummary, RoomParticipation } from '../../types';

vi.mock('../../api');

describe('MyRooms Component', () => {
  const onOpenRoomAsHostMock = vi.fn();
  const onOpenRoomAsParticipantMock = vi.fn();

  const mockHosted: RoomSummary[] = [
    {
      id: 'host-1',
      title: 'Hosted Holiday Party',
      status: 'collecting',
      participantCount: 5,
      createdAt: '2026-11-19T00:00:00Z',
      adminToken: 'admin-tok-1',
    },
  ];

  const mockParticipating: RoomParticipation[] = [
    {
      id: 'part-1',
      title: 'Friends Secret Santa',
      hostName: 'Олена Петрівна',
      status: 'shuffled',
      participantCount: 4,
      createdAt: '2026-11-19T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(api.getMyRooms).mockImplementationOnce(() => new Promise(() => {}));
    vi.mocked(api.getParticipatingRooms).mockImplementationOnce(() => new Promise(() => {}));

    render(
      <MyRooms
        onOpenRoomAsHost={onOpenRoomAsHostMock}
        onOpenRoomAsParticipant={onOpenRoomAsParticipantMock}
      />
    );

    expect(screen.getByText(/завантаження ваших кімнат/i)).toBeInTheDocument();
  });

  it('renders participating rooms by default and switches to hosted rooms tab', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getMyRooms).mockResolvedValue(mockHosted);
    vi.mocked(api.getParticipatingRooms).mockResolvedValue(mockParticipating);

    render(
      <MyRooms
        onOpenRoomAsHost={onOpenRoomAsHostMock}
        onOpenRoomAsParticipant={onOpenRoomAsParticipantMock}
      />
    );

    // Initial default tab is "Я учасник"
    await waitFor(() => {
      expect(screen.getByText('Friends Secret Santa')).toBeInTheDocument();
      expect(screen.getByText(/організатор: олена петрівна/i)).toBeInTheDocument();
    });

    // Switch to "Я організатор"
    const hostTabBtn = screen.getByRole('tab', { name: /я організатор/i });
    await user.click(hostTabBtn);

    expect(screen.getByText('Hosted Holiday Party')).toBeInTheDocument();
  });

  it('navigates to room as participant when item clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getMyRooms).mockResolvedValue([]);
    vi.mocked(api.getParticipatingRooms).mockResolvedValue(mockParticipating);

    render(
      <MyRooms
        onOpenRoomAsHost={onOpenRoomAsHostMock}
        onOpenRoomAsParticipant={onOpenRoomAsParticipantMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Friends Secret Santa')).toBeInTheDocument();
    });

    const roomItem = screen.getByText('Friends Secret Santa');
    await user.click(roomItem);

    expect(onOpenRoomAsParticipantMock).toHaveBeenCalledWith('part-1');
  });

  it('navigates to room as host when item clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getMyRooms).mockResolvedValue(mockHosted);
    vi.mocked(api.getParticipatingRooms).mockResolvedValue([]);

    render(
      <MyRooms
        onOpenRoomAsHost={onOpenRoomAsHostMock}
        onOpenRoomAsParticipant={onOpenRoomAsParticipantMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Я організатор (1)')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Я організатор (1)'));

    const menuBtn = screen.getByTitle('Дії');
    await user.click(menuBtn);

    const manageBtn = screen.getByRole('button', { name: /керувати/i });
    await user.click(manageBtn);

    expect(onOpenRoomAsHostMock).toHaveBeenCalledWith('host-1', 'admin-tok-1');
  });
});
