import { api } from './client';

interface LobbyField {
  id: string;
  name: string;
  location: string;
  city: string;
}

interface LobbyListItem {
  id: string;
  field: LobbyField;
  date: string;
  timeSlot: string;
  intensity: string;
  maxPlayers: number;
  feePerPlayer: number;
  status: string;
  participantCount: number;
  paidCount: number;
  createdBy: string;
}

interface LobbyParticipant {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  position: string | null;
  hasPaid: boolean;
  joinedAt: string;
}

export function getLobbies(filters?: { fieldId?: string; city?: string; intensity?: string; date?: string }) {
  const params = new URLSearchParams();
  if (filters?.fieldId) params.set('fieldId', filters.fieldId);
  if (filters?.city) params.set('city', filters.city);
  if (filters?.intensity) params.set('intensity', filters.intensity);
  if (filters?.date) params.set('date', filters.date);
  const qs = params.toString();
  return api.get<{ lobbies: LobbyListItem[] }>(`/lobbies${qs ? `?${qs}` : ''}`);
}

export function getLobbyById(id: string) {
  return api.get<{
    lobby: {
      id: string;
      status: string;
      intensity: string;
      maxPlayers: number;
      feePerPlayer: number;
      participantCount: number;
      paidCount: number;
      createdBy: string;
      createdAt: string;
    };
    field: LobbyField;
    timetable: { date: string; timeSlot: string };
    participants: LobbyParticipant[];
  }>(`/lobbies/${id}`);
}

export function createLobby(data: {
  fieldId: string;
  timetableId?: string;
  date?: string;
  timeSlot?: string;
  intensity?: string;
  maxPlayers?: number;
  feePerPlayer?: number;
}) {
  return api.post<{ lobby: LobbyListItem }>('/lobbies', data);
}

export function joinLobby(id: string) {
  return api.post<{
    message: string;
    lobby: { id: string; status: string; participantCount: number; paidCount: number; maxPlayers: number };
  }>(`/lobbies/${id}/join`);
}

export function payLobby(id: string) {
  return api.post<{
    message: string;
    wallet: { balance: number; escrow: number };
    lobbyStatus: string;
  }>(`/lobbies/${id}/pay`);
}

export function cancelLobby(id: string) {
  return api.post<{ message: string; refundedCount: number }>(`/lobbies/${id}/cancel`);
}

export function leaveLobby(id: string) {
  return api.post<{ message: string }>(`/lobbies/${id}/leave`);
}

export function getLobbyMessages(id: string) {
  return api.get<{
    messages: {
      id: string;
      senderId: string;
      senderName: string;
      content: string;
      createdAt: string;
    }[];
  }>(`/lobbies/${id}/messages`);
}

export function sendLobbyMessage(id: string, content: string) {
  return api.post<{
    message: {
      id: string;
      senderId: string;
      senderName: string;
      content: string;
      createdAt: string;
    };
  }>(`/lobbies/${id}/messages`, { content });
}
