import type {
  CreateParticipantData,
  CreateRoomData,
  MyAssignment,
  Participant,
  RoomAdmin,
  RoomPublic,
  ShuffleResponse,
  TelegramConfig,
} from './types';

const API_BASE = '/api/rooms';

export async function createRoom(data: CreateRoomData): Promise<RoomAdmin> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Помилка створення кімнати');
  }
  return res.json();
}

export async function getRoom(id: string): Promise<RoomPublic> {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Кімнату не знайдено');
  }
  return res.json();
}

export async function getRoomAdmin(id: string, adminToken: string): Promise<RoomAdmin> {
  const res = await fetch(`${API_BASE}/${id}/admin?adminToken=${encodeURIComponent(adminToken)}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Недійсний токен організатора');
  }
  return res.json();
}

export async function addParticipant(
  roomId: string,
  data: CreateParticipantData
): Promise<Participant> {
  const res = await fetch(`${API_BASE}/${roomId}/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Помилка додавання учасника');
  }
  return res.json();
}

export async function removeParticipant(
  roomId: string,
  participantId: string,
  adminToken: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/${roomId}/participants/${participantId}?adminToken=${encodeURIComponent(adminToken)}`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Помилка видалення учасника');
  }
}

export async function saveRestrictions(
  roomId: string,
  adminToken: string,
  restrictions: Array<{ giverId: string; receiverId: string }>
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/${roomId}/restrictions?adminToken=${encodeURIComponent(adminToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restrictions }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Помилка збереження обмежень');
  }
}

export async function performShuffle(roomId: string, adminToken: string): Promise<ShuffleResponse> {
  const res = await fetch(
    `${API_BASE}/${roomId}/shuffle?adminToken=${encodeURIComponent(adminToken)}`,
    { method: 'POST' }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Помилка жеребкування');
  }
  return res.json();
}

export async function getMyAssignment(roomId: string, telegramId: number): Promise<MyAssignment> {
  const res = await fetch(`${API_BASE}/${roomId}/my-assignment?telegramId=${telegramId}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Не вдалося отримати підопічного');
  }
  return res.json();
}

export async function getTelegramConfig(): Promise<TelegramConfig> {
  try {
    const res = await fetch('/api/telegram/config');
    if (!res.ok) throw new Error('Помилка завантаження конфігурації');
    return res.json();
  } catch {
    return { botUsername: '', configured: false };
  }
}
