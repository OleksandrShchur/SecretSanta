export interface Participant {
  id: string;
  roomId: string;
  firstName: string;
  lastName: string;
  telegramId: number;
  telegramUsername?: string | null;
  wishlist?: string | null;
  createdAt: string;
}

export interface Restriction {
  id: string;
  giverId: string;
  receiverId: string;
}

export interface ParticipantPublic {
  id: string;
  firstName: string;
  lastName: string;
}

export interface MyRegistration {
  id: string;
  firstName: string;
  lastName: string;
  wishlist?: string | null;
}

export interface RoomPublic {
  id: string;
  title: string;
  hostName: string;
  status: 'collecting' | 'shuffled' | 'closed';
  participantCount: number;
  createdAt: string;
  participants: ParticipantPublic[];
  myRegistration?: MyRegistration | null;
}

export interface RoomSummary {
  id: string;
  title: string;
  status: 'collecting' | 'shuffled' | 'closed';
  participantCount: number;
  createdAt: string;
  adminToken: string;
}

export interface RoomParticipation {
  id: string;
  title: string;
  hostName: string;
  status: 'collecting' | 'shuffled' | 'closed';
  participantCount: number;
  createdAt: string;
}

export interface RoomAdmin {
  id: string;
  title: string;
  hostName: string;
  hostTelegramId: number;
  hostUsername?: string | null;
  adminToken: string;
  status: 'collecting' | 'shuffled' | 'closed';
  createdAt: string;
  participants: Participant[];
  restrictions: Restriction[];
}

export interface CreateRoomData {
  title: string;
  hostFirstName: string;
  hostLastName?: string;
  hostTelegramId: number;
  hostUsername?: string;
  hostParticipates: boolean;
  hostWishlist?: string;
}

export interface CreateParticipantData {
  firstName: string;
  lastName?: string;
  telegramId: number;
  telegramUsername?: string;
  wishlist?: string;
}

export interface MyAssignment {
  roomTitle: string;
  receiverFirstName: string;
  receiverLastName: string;
  receiverUsername?: string | null;
  receiverWishlist?: string | null;
}

export interface ShuffleResponse {
  success: boolean;
  totalParticipants: number;
  notificationsSent: number;
  errorMessage?: string | null;
}

export interface TelegramConfig {
  botUsername: string;
  configured: boolean;
  appShortName?: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}
