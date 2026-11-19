import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyAssignmentCard } from '../MyAssignmentCard';
import * as api from '../../api';
import type { MyAssignment } from '../../types';

vi.mock('../../api');

describe('MyAssignmentCard Component', () => {
  const roomId = 'room-123';
  const telegramId = 100000001;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(api.getMyAssignment).mockImplementationOnce(() => new Promise(() => {}));

    render(<MyAssignmentCard roomId={roomId} telegramId={telegramId} />);

    expect(screen.getByText(/завантаження результатів жеребкування/i)).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    vi.mocked(api.getMyAssignment).mockRejectedValue(new Error('Призначення не знайдено'));

    render(<MyAssignmentCard roomId={roomId} telegramId={telegramId} />);

    await waitFor(() => {
      expect(screen.getByText('Призначення не знайдено')).toBeInTheDocument();
    });
  });

  it('initially renders sealed card and reveals recipient upon click', async () => {
    const user = userEvent.setup();
    const mockAssignment: MyAssignment = {
      roomTitle: 'Holiday 2026',
      receiverFirstName: 'Марія',
      receiverLastName: 'Коваль',
      receiverUsername: 'maria_k',
      receiverWishlist: 'Теплий плед',
    };

    vi.mocked(api.getMyAssignment).mockResolvedValue(mockAssignment);

    render(<MyAssignmentCard roomId={roomId} telegramId={telegramId} />);

    // Sealed state
    await waitFor(() => {
      expect(screen.getByText('Таємниця готова до розкриття! 🎁')).toBeInTheDocument();
      expect(screen.getByText('Розкрити мого підопічного 🎄')).toBeInTheDocument();
      expect(screen.queryByText('Марія Коваль')).not.toBeInTheDocument();
    });

    // Click reveal
    const revealBtn = screen.getByText('Розкрити мого підопічного 🎄');
    await user.click(revealBtn);

    // Revealed state
    expect(screen.getByText(/ви даруєте подарунок для:/i)).toBeInTheDocument();
    expect(screen.getByText('🎅 Марія Коваль')).toBeInTheDocument();
    expect(screen.getByText('@maria_k')).toBeInTheDocument();
    expect(screen.getByText(/теплий плед/i)).toBeInTheDocument();

    // Conceal again
    const hideBtn = screen.getByRole('button', { name: /сховати підопічного/i });
    await user.click(hideBtn);

    // Sealed again
    expect(screen.getByText('Таємниця готова до розкриття! 🎁')).toBeInTheDocument();
  });

  it('displays fallback message when receiver has no wishlist', async () => {
    const user = userEvent.setup();
    const mockAssignment: MyAssignment = {
      roomTitle: 'Holiday 2026',
      receiverFirstName: 'Петро',
      receiverLastName: 'Іванов',
      receiverUsername: null,
      receiverWishlist: null,
    };

    vi.mocked(api.getMyAssignment).mockResolvedValue(mockAssignment);

    render(<MyAssignmentCard roomId={roomId} telegramId={telegramId} />);

    const revealBtn = await screen.findByText('Розкрити мого підопічного 🎄');
    await user.click(revealBtn);

    expect(screen.getByText('🎅 Петро Іванов')).toBeInTheDocument();
    expect(screen.getByText(/підопічний не залишив побажань/i)).toBeInTheDocument();
  });
});
