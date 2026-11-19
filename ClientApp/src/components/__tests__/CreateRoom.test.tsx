import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateRoom } from '../CreateRoom';
import * as api from '../../api';

vi.mock('../../api');

describe('CreateRoom Component', () => {
  const onRoomCreatedMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields with Telegram defaults', () => {
    render(<CreateRoom onRoomCreated={onRoomCreatedMock} />);

    expect(screen.getByRole('heading', { name: /створити кімнату в telegram/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/назва кімнати або події/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ваше ім'я/i)).toHaveValue('Олександр');
    expect(screen.getByLabelText(/прізвище/i)).toHaveValue('Щур');
    expect(screen.getByRole('checkbox', { name: /я також беру участь/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText(/ваші побажання до подарунка/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /створити кімнату в telegram/i })).toBeInTheDocument();
  });

  it('shows validation errors when title is missing', async () => {
    const user = userEvent.setup();
    render(<CreateRoom onRoomCreated={onRoomCreatedMock} />);

    const submitBtn = screen.getByRole('button', { name: /створити кімнату в telegram/i });
    await user.click(submitBtn);

    expect(screen.getByPlaceholderText(/вкажіть назву кімнати/i)).toBeInTheDocument();
    expect(api.createRoom).not.toHaveBeenCalled();
    expect(onRoomCreatedMock).not.toHaveBeenCalled();
  });

  it('toggles wishlist input visibility when host participation changes', async () => {
    const user = userEvent.setup();
    render(<CreateRoom onRoomCreated={onRoomCreatedMock} />);

    const checkbox = screen.getByRole('checkbox', { name: /я також беру участь/i });
    expect(screen.getByLabelText(/ваші побажання до подарунка/i)).toBeInTheDocument();

    await user.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByLabelText(/ваші побажання до подарунка/i)).not.toBeInTheDocument();
  });

  it('submits form successfully and calls onRoomCreated callback', async () => {
    const user = userEvent.setup();
    const mockRoom = {
      id: 'room-123',
      title: 'Party 2026',
      hostName: 'Олександр Щур',
      hostTelegramId: 100000001,
      adminToken: 'admin-token-xyz',
      status: 'collecting' as const,
      createdAt: '2026-11-19T00:00:00Z',
      participants: [],
      restrictions: [],
    };
    vi.mocked(api.createRoom).mockResolvedValue(mockRoom);

    render(<CreateRoom onRoomCreated={onRoomCreatedMock} />);

    const titleInput = screen.getByLabelText(/назва кімнати або події/i);
    await user.type(titleInput, 'Party 2026');

    const submitBtn = screen.getByRole('button', { name: /створити кімнату/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.createRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Party 2026',
          hostFirstName: 'Олександр',
          hostParticipates: true,
        })
      );
      expect(onRoomCreatedMock).toHaveBeenCalledWith('room-123', 'admin-token-xyz');
    });
  });

  it('displays error alert when API call fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createRoom).mockRejectedValue(new Error('Помилка зʼєднання з сервером'));

    render(<CreateRoom onRoomCreated={onRoomCreatedMock} />);

    const titleInput = screen.getByLabelText(/назва кімнати або події/i);
    await user.type(titleInput, 'Broken Room');

    const submitBtn = screen.getByRole('button', { name: /створити кімнату/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Помилка зʼєднання з сервером')).toBeInTheDocument();
      expect(onRoomCreatedMock).not.toHaveBeenCalled();
    });
  });
});
