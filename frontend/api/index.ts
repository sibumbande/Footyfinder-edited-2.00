// ── Re-exports from module files ────────────────────────────────────────────

export { api, ApiError } from './client';
export { register, login, logout, getToken, isLoggedIn } from './auth';
export { createTeam, getMyTeam, getTeamById, joinTeam, leaveTeam, updateTeam, contributeToTeam, saveTeamLayout, getAllTeams, toggleTeamRecruiting, inviteToTeam, requestToJoinTeam, getTeamJoinRequests, respondToJoinRequest, getMyTeamInvites, respondToTeamInvite, getTeamTransactions } from './teams';
export { getLobbies, getLobbyById, createLobby, joinLobby, payLobby, cancelLobby, leaveLobby, getLobbyMessages, sendLobbyMessage, getLobbyFormation, pickLobbyPosition, acceptLobbyChallenge } from './lobbies';
export { loadFunds, getTransactions } from './payments';

// ── Matches ──────────────────────────────────────────────────────────────────

import { api } from './client';

export function completeMatch(data: {
  lobbyId: string;
  scoreHome?: number;
  scoreAway?: number;
  players?: { userId: string; teamSide: string; goals?: number; assists?: number; rating?: number }[];
}) {
  return api.post<{
    match: {
      id: string;
      lobbyId: string;
      date: string;
      field: { id: string; name: string; location: string };
      scoreHome: number;
      scoreAway: number;
      status: string;
    };
    financials: {
      totalCollected: number;
      fieldOwnerPayout: number;
      platformFee: number;
    };
  }>('/matches/complete', data);
}

// ── Users ───────────────────────────────────────────────────────────────────

export function getUserById(id: string) {
  return api.get<{
    user: {
      id: string;
      username: string;
      fullName: string;
      avatarUrl: string | null;
      position: string | null;
      fitnessLevel: string | null;
      city: string | null;
      bio: string | null;
    };
  }>(`/users/${id}`);
}

export function getMe() {
  return api.get<{
    user: {
      id: string;
      email: string;
      username: string;
      fullName: string;
      phone: string | null;
      avatarUrl: string | null;
      position: string | null;
      fitnessLevel: string | null;
      bio: string | null;
      city: string | null;
      createdAt: string;
    };
    wallet: { balance: number; escrow: number };
    team: { id: string; name: string; role: string } | null;
  }>('/users/me');
}

export function updateMe(data: {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  position?: string;
  fitnessLevel?: string;
  bio?: string;
  city?: string;
}) {
  return api.put<{
    user: {
      id: string;
      email: string;
      username: string;
      fullName: string;
      phone: string | null;
      avatarUrl: string | null;
      position: string | null;
      fitnessLevel: string | null;
      bio: string | null;
      city: string | null;
      createdAt: string;
    };
  }>('/users/me', data);
}

export function getMyWallet() {
  return api.get<{
    wallet: { balance: number; escrow: number };
    transactions: {
      id: string;
      type: string;
      amount: number;
      description: string;
      reference: string | null;
      createdAt: string;
    }[];
  }>('/users/me/wallet');
}

// ── Fields ──────────────────────────────────────────────────────────────────

export function getFields(filters?: { city?: string }) {
  const params = new URLSearchParams();
  if (filters?.city) params.set('city', filters.city);
  const qs = params.toString();
  return api.get<{
    fields: {
      id: string;
      name: string;
      location: string;
      city: string;
      imageUrl: string | null;
      pricePerSlot: number;
      surfaceType: string | null;
      capacity: number;
    }[];
  }>(`/fields${qs ? `?${qs}` : ''}`);
}

export function getFieldById(id: string) {
  return api.get<{
    field: {
      id: string;
      name: string;
      location: string;
      city: string;
      imageUrl: string | null;
      pricePerSlot: number;
      surfaceType: string | null;
      capacity: number;
    };
    timetable: {
      id: string;
      date: string;
      timeSlot: string;
      status: string;
      lobbyId: string | null;
    }[];
  }>(`/fields/${id}`);
}

export function getFieldTimetable(id: string, date?: string) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  const qs = params.toString();
  return api.get<{
    timetable: {
      id: string;
      date: string;
      timeSlot: string;
      status: string;
      lobbyId: string | null;
    }[];
  }>(`/fields/${id}/timetable${qs ? `?${qs}` : ''}`);
}

export function addField(data: {
  name: string;
  location: string;
  city: string;
  imageUrl?: string;
  pricePerSlot?: number;
  surfaceType?: string;
  capacity?: number;
  ownerName: string;
  ownerEmail: string;
  ownerBankAccount?: string;
  ownerBankName?: string;
  ownerPaystackSubaccount?: string;
}) {
  return api.post<{
    field: {
      id: string;
      name: string;
      location: string;
      city: string;
      imageUrl: string | null;
      pricePerSlot: number;
      surfaceType: string | null;
      capacity: number;
    };
  }>('/fields', data);
}

export function updateField(id: string, data: {
  name?: string;
  location?: string;
  city?: string;
  imageUrl?: string;
  pricePerSlot?: number;
  surfaceType?: string;
  capacity?: number;
  ownerName?: string;
  ownerEmail?: string;
  ownerBankAccount?: string;
  ownerBankName?: string;
  ownerPaystackSubaccount?: string;
}) {
  return api.put<{
    field: {
      id: string;
      name: string;
      location: string;
      city: string;
      imageUrl: string | null;
      pricePerSlot: number;
      surfaceType: string | null;
      capacity: number;
    };
  }>(`/fields/${id}`, data);
}

export function deleteField(id: string) {
  return api.delete<{ message: string }>(`/fields/${id}`);
}

export function regenerateFieldTimetable(id: string) {
  return api.post<{
    message: string;
    timetable: {
      id: string;
      date: string;
      timeSlot: string;
      status: string;
      lobbyId: string | null;
    }[];
  }>(`/fields/${id}/regenerate-timetable`);
}

// ── Matches ─────────────────────────────────────────────────────────────────

export function getMyMatches() {
  return api.get<{
    matches: {
      id: string;
      date: string;
      field: { name: string; location: string };
      scoreHome: number;
      scoreAway: number;
      status: string;
      teamSide: string;
      goals: number;
      assists: number;
      rating: number | null;
    }[];
  }>('/matches');
}

export function getMatchById(id: string) {
  return api.get<{
    match: {
      id: string;
      lobbyId: string;
      date: string;
      scoreHome: number;
      scoreAway: number;
      status: string;
    };
    field: { id: string; name: string; location: string; city: string };
    players: {
      userId: string;
      username: string;
      fullName: string;
      avatarUrl: string | null;
      teamSide: string;
      goals: number;
      assists: number;
      rating: number | null;
    }[];
    financials?: {
      totalCollected: number;
      fieldOwnerPayout: number;
      platformFee: number;
      payoutStatus: string;
    };
  }>(`/matches/${id}`);
}

export function getMyStats() {
  return api.get<{
    totalMatches: number;
    totalGoals: number;
    totalAssists: number;
    averageRating: number | null;
    wins: number;
    losses: number;
    draws: number;
  }>('/matches/stats/me');
}

// ── Social ──────────────────────────────────────────────────────────────────

export function discoverPlayers(filters?: { city?: string; position?: string }) {
  const params = new URLSearchParams();
  if (filters?.city) params.set('city', filters.city);
  if (filters?.position) params.set('position', filters.position);
  const qs = params.toString();
  return api.get<{
    users: {
      id: string;
      username: string;
      fullName: string;
      avatarUrl: string | null;
      position: string | null;
      fitnessLevel: string | null;
      city: string | null;
    }[];
  }>(`/social/discover${qs ? `?${qs}` : ''}`);
}

export function sendFriendRequest(userId: string) {
  return api.post<{ message: string; requestId: string }>('/social/friend-request', { addresseeId: userId });
}

export function respondToFriendRequest(requestId: string, accept: boolean) {
  return api.put<{ message: string }>(`/social/friend-request/${requestId}`, {
    status: accept ? 'ACCEPTED' : 'DECLINED',
  });
}

export function getFriends() {
  return api.get<{
    friends: {
      id: string;
      username: string;
      fullName: string;
      avatarUrl: string | null;
      position: string | null;
      fitnessLevel: string | null;
      city: string | null;
    }[];
  }>('/social/friends');
}

export function getFriendRequests() {
  return api.get<{
    requests: {
      requestId: string;
      status: string;
      createdAt: string;
      from: {
        id: string;
        username: string;
        fullName: string;
        avatarUrl: string | null;
        position: string | null;
      };
    }[];
  }>('/social/friend-requests');
}

// ── Training ─────────────────────────────────────────────────────────────────

export interface TrainingSession {
  id: string;
  title: string;
  description: string | null;
  date: string;
  timeSlot: string;
  location: string | null;
  slotsCount: number;
  feePerPlayer: number;
  maxPlayers: number;
  status: string;
  participantCount: number;
  paidCount: number;
  createdBy: string;
  creatorName: string;
  creatorAvatar: string | null;
  field: { id: string; name: string; location: string; city: string } | null;
  createdAt: string;
}

export function getTrainingSessions(filters?: { city?: string; date?: string }) {
  const params = new URLSearchParams();
  if (filters?.city) params.set('city', filters.city);
  if (filters?.date) params.set('date', filters.date);
  const qs = params.toString();
  return api.get<{ sessions: TrainingSession[] }>(`/training${qs ? `?${qs}` : ''}`);
}

export function getTrainingSessionById(id: string) {
  return api.get<{
    session: TrainingSession;
    participants: {
      userId: string;
      username: string;
      fullName: string;
      avatarUrl: string | null;
      position: string | null;
      hasPaid: boolean;
      joinedAt: string;
    }[];
  }>(`/training/${id}`);
}

export function createTrainingSession(data: {
  title: string;
  fieldId?: string;
  timetableIds?: string[];
  date: string;
  timeSlot: string;
  location?: string;
  maxPlayers?: number;
  description?: string;
}) {
  return api.post<{ session: TrainingSession }>('/training', data);
}

export function postTrainingSession(id: string) {
  return api.post<{ message: string; session: TrainingSession }>(`/training/${id}/post`);
}

export function joinTrainingSession(id: string) {
  return api.post<{ message: string; session: TrainingSession }>(`/training/${id}/join`);
}

export function payTrainingSession(id: string) {
  return api.post<{
    message: string;
    wallet: { balance: number; escrow: number };
    sessionStatus: string;
  }>(`/training/${id}/pay`);
}

export function leaveTrainingSession(id: string) {
  return api.post<{ message: string }>(`/training/${id}/leave`);
}

export function cancelTrainingSession(id: string) {
  return api.post<{ message: string; refundedCount: number }>(`/training/${id}/cancel`);
}

export function completeTrainingSession(id: string) {
  return api.post<{
    message: string;
    financials: {
      totalCollected: number;
      fieldOwnerPayout: number;
      platformFee: number;
      paidParticipants: number;
    };
  }>(`/training/${id}/complete`);
}

export function confirmTrainingSession(id: string) {
  return api.post<{
    message: string;
    removedUnpaid: number;
    session: TrainingSession;
  }>(`/training/${id}/confirm`);
}

export function submitTrainingReview(sessionId: string, reviews: { userId: string; rating: number; comment?: string }[]) {
  return api.post<{ message: string; submitted: number }>(`/training/${sessionId}/review`, { reviews });
}

export function getUserReviews(userId: string) {
  return api.get<{
    reviews: {
      id: string;
      sessionType: string;
      sessionId: string;
      rating: number;
      comment: string | null;
      createdAt: string;
      reviewer: {
        id: string;
        username: string;
        fullName: string;
        avatarUrl: string | null;
      };
    }[];
    averageRating: number | null;
    totalReviews: number;
  }>(`/users/${userId}/reviews`);
}

export function getTrainingStats(userId: string) {
  return api.get<{ trainingSessions: number }>(`/users/${userId}/training-stats`);
}

export function getTrainingMessages(id: string) {
  return api.get<{
    messages: {
      id: string;
      senderId: string;
      senderName: string;
      content: string;
      createdAt: string;
    }[];
  }>(`/training/${id}/messages`);
}

export function sendTrainingMessage(id: string, content: string) {
  return api.post<{
    message: {
      id: string;
      senderId: string;
      senderName: string;
      content: string;
      createdAt: string;
    };
  }>(`/training/${id}/messages`, { content });
}
