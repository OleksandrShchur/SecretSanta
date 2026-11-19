import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineGenerator } from '../OfflineGenerator';

describe('OfflineGenerator Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders initial form and empty participant state', () => {
    render(<OfflineGenerator />);

    expect(screen.getByText('Швидке жеребкування на місці')).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Введіть ім'я учасника...")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /додати/i })).toBeInTheDocument();
  });

  it('validates empty name input on submit', async () => {
    const user = userEvent.setup();
    render(<OfflineGenerator />);

    const addButton = screen.getByRole('button', { name: /додати/i });
    await user.click(addButton);

    expect(screen.getByText("Ім'я учасника не може бути порожнім!")).toBeInTheDocument();
  });

  it('adds participants to list', async () => {
    const user = userEvent.setup();
    render(<OfflineGenerator />);

    const input = screen.getByPlaceholderText("Введіть ім'я учасника...");
    const addButton = screen.getByRole('button', { name: /додати/i });

    await user.type(input, 'Олена');
    await user.click(addButton);

    expect(screen.getByText('Олена')).toBeInTheDocument();
    expect(screen.getByText(/учасники \(1\)/i)).toBeInTheDocument();
  });

  it('prevents adding duplicate participant names', async () => {
    const user = userEvent.setup();
    render(<OfflineGenerator />);

    const input = screen.getByPlaceholderText("Введіть ім'я учасника...");
    const addButton = screen.getByRole('button', { name: /додати/i });

    await user.type(input, 'Богдан');
    await user.click(addButton);

    await user.type(input, 'Богдан');
    await user.click(addButton);

    expect(screen.getByText('Учасник з таким імʼям вже існує!')).toBeInTheDocument();
  });

  it('removes a participant when clicking remove button', async () => {
    const user = userEvent.setup();
    render(<OfflineGenerator />);

    const input = screen.getByPlaceholderText("Введіть ім'я учасника...");
    const addButton = screen.getByRole('button', { name: /додати/i });

    await user.type(input, 'Тарас');
    await user.click(addButton);
    expect(screen.getByText('Тарас')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /видалити тарас/i });
    await user.click(deleteBtn);

    expect(screen.queryByText('Тарас')).not.toBeInTheDocument();
  });

  it('disables shuffle button when fewer than 3 participants', async () => {
    const user = userEvent.setup();
    render(<OfflineGenerator />);

    const input = screen.getByPlaceholderText("Введіть ім'я учасника...");
    const addButton = screen.getByRole('button', { name: /додати/i });

    await user.type(input, 'Один');
    await user.click(addButton);
    await user.type(input, 'Два');
    await user.click(addButton);

    const shuffleButton = screen.getByRole('button', { name: /згенерувати жеребкування/i });
    expect(shuffleButton).toBeDisabled();
    expect(screen.getByText('Потрібно мін. 3')).toBeInTheDocument();
  });

  it('generates pairs when 3+ participants added', async () => {
    const user = userEvent.setup();
    render(<OfflineGenerator />);

    const input = screen.getByPlaceholderText("Введіть ім'я учасника...");
    const addButton = screen.getByRole('button', { name: /додати/i });

    await user.type(input, 'Андрій');
    await user.click(addButton);
    await user.type(input, 'Оксана');
    await user.click(addButton);
    await user.type(input, 'Василь');
    await user.click(addButton);

    const shuffleButton = screen.getByRole('button', { name: /згенерувати жеребкування/i });
    expect(shuffleButton).not.toBeDisabled();
    await user.click(shuffleButton);

    expect(screen.getByText(/результати жеребкування/i)).toBeInTheDocument();
    expect(screen.getAllByText('Дарує')).toHaveLength(3);
    expect(screen.getAllByText('Отримує')).toHaveLength(3);
  });

  it('toggles mode with restrictions and allows setting constraints', async () => {
    const user = userEvent.setup();
    render(<OfflineGenerator />);

    const input = screen.getByPlaceholderText("Введіть ім'я учасника...");
    const addButton = screen.getByRole('button', { name: /додати/i });

    await user.type(input, 'Аліса');
    await user.click(addButton);
    await user.type(input, 'Боб');
    await user.click(addButton);
    await user.type(input, 'Чарлі');
    await user.click(addButton);

    const withRestrictionsBtn = screen.getByRole('button', { name: /з обмеженнями/i });
    await user.click(withRestrictionsBtn);

    expect(screen.getByText(/натисніть на ім'я, щоб заборонити пару/i)).toBeInTheDocument();
    const chipButtons = screen.getAllByTitle(/може дарувати/i);
    expect(chipButtons.length).toBeGreaterThan(0);

    // Click chip to restrict
    await user.click(chipButtons[0]);
    expect(chipButtons[0].className).toContain('chip-restricted');
  });

  it('copies results to clipboard', async () => {
    const user = userEvent.setup();
    render(<OfflineGenerator />);

    const input = screen.getByPlaceholderText("Введіть ім'я учасника...");
    const addButton = screen.getByRole('button', { name: /додати/i });

    await user.type(input, 'А');
    await user.click(addButton);
    await user.type(input, 'Б');
    await user.click(addButton);
    await user.type(input, 'В');
    await user.click(addButton);

    const shuffleButton = screen.getByRole('button', { name: /згенерувати жеребкування/i });
    await user.click(shuffleButton);

    const copyBtn = screen.getByRole('button', { name: /копіювати список/i });
    await user.click(copyBtn);

    expect(screen.getByText('Скопійовано!')).toBeInTheDocument();
  });
});
