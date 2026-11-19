import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Navbar } from '../Navbar';
import { Header } from '../Header';
import { FloatingInput } from '../FloatingInput';

describe('Navbar Component', () => {
  it('renders tabs with correct active state and switches tabs on click', async () => {
    const user = userEvent.setup();
    const onTabChangeMock = vi.fn();

    const { rerender } = render(<Navbar activeTab="online" onTabChange={onTabChangeMock} />);

    const onlineTab = screen.getByRole('tab', { name: /кімната в telegram/i });
    const offlineTab = screen.getByRole('tab', { name: /швидке \(офлайн\)/i });

    expect(onlineTab).toHaveAttribute('aria-selected', 'true');
    expect(offlineTab).toHaveAttribute('aria-selected', 'false');

    await user.click(offlineTab);
    expect(onTabChangeMock).toHaveBeenCalledWith('offline');

    rerender(<Navbar activeTab="offline" onTabChange={onTabChangeMock} />);
    expect(offlineTab).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Header Component', () => {
  it('renders title and user indicator', () => {
    render(<Header />);

    expect(screen.getByText(/таємний санта/i)).toBeInTheDocument();
    expect(screen.getByText(/олександр щур/i)).toBeInTheDocument();
  });

  it('renders back button when onBack prop is provided', async () => {
    const user = userEvent.setup();
    const onBackMock = vi.fn();

    render(<Header onBack={onBackMock} />);

    const backBtn = screen.getByRole('button', { name: /назад/i });
    expect(backBtn).toBeInTheDocument();

    await user.click(backBtn);
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });
});

describe('FloatingInput Component', () => {
  it('renders input with label and shows error in placeholder when touched', () => {
    render(
      <FloatingInput
        id="test-input"
        label="Test Label"
        value=""
        onChange={() => {}}
        error="Поле є обов'язковим"
      />
    );

    expect(screen.getByLabelText(/test label/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Поле є обов'язковим")).toBeInTheDocument();
  });
});
