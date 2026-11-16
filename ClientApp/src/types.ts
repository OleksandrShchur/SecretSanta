export interface Participant {
  id: string;
  roomId: string;
  firstName: string;
  lastName: string;
  email: string;
  wishlist?: string | null;
  createdAt: string;
}

export interface Restriction {
  id: string;
  giverId: string;
  receiverId: string;
}

export interface RoomPublic {
  id: string;
  title: string;
  hostName: string;
  status: 'collecting' | 'shuffled' | 'closed';
  createdAt: string;
}

export interface RoomAdmin {
  id: string;
  title: string;
  hostName: string;
  hostEmail: string;
  adminToken: string;
  status: 'collecting' | 'shuffled' | 'closed';
  createdAt: string;
  participants: Participant[];
  restrictions: Restriction[];
}

export interface CreateRoomData {
  title: string;
  hostFirstName: string;
  hostLastName: string;
  hostEmail: string;
  hostParticipates: boolean;
  hostWishlist?: string;
}

export interface CreateParticipantData {
  firstName: string;
  lastName: string;
  email: string;
  wishlist?: string;
}

export interface ShuffleResponse {
  success: boolean;
  totalParticipants: number;
  emailsSent: number;
  errorMessage?: string | null;
}
