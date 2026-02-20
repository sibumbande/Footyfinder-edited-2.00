// ── Canonical API types shared between frontend & backend ────────────────────

// ── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  position: string | null;
  fitnessLevel: string | null;
  city: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  username: string;
  phone?: string;
  city?: string;
  position?: string;
  fitnessLevel?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ── Users ───────────────────────────────────────────────────────────────────

export interface UserProfile {
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
}

export interface UserTeamInfo {
  id: string;
  name: string;
  role: string;
}

export interface WalletInfo {
  balance: number;
  escrow: number;
}

export interface TransactionRecord {
  id: string;
  type: string;
  amount: number;
  description: string;
  reference: string | null;
  createdAt: string;
}

export interface GetMeResponse {
  user: UserProfile;
  wallet: WalletInfo;
  team: UserTeamInfo | null;
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  position?: string;
  fitnessLevel?: string;
  bio?: string;
  city?: string;
}

export interface GetWalletResponse {
  wallet: WalletInfo;
  transactions: TransactionRecord[];
}

export interface GetTransactionsResponse {
  transactions: TransactionRecord[];
}

export interface PublicUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  position: string | null;
  fitnessLevel: string | null;
  city: string | null;
}

// ── Fields ──────────────────────────────────────────────────────────────────

export interface FieldInfo {
  id: string;
  name: string;
  location: string;
  city: string;
  imageUrl: string | null;
  pricePerSlot: number;
  surfaceType: string | null;
  capacity: number;
}

export interface TimetableSlot {
  id: string;
  date: string;
  timeSlot: string;
  status: string;
  lobbyId: string | null;
}

export interface GetFieldsResponse {
  fields: FieldInfo[];
}

export interface GetFieldResponse {
  field: FieldInfo;
  timetable: TimetableSlot[];
}

export interface GetTimetableResponse {
  timetable: TimetableSlot[];
}

// ── Teams ───────────────────────────────────────────────────────────────────

export interface TeamInfo {
  id: string;
  name: string;
  captainId: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  position: string | null;
  role: string;
}

export interface CreateTeamPayload {
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface CreateTeamResponse {
  team: TeamInfo;
  wallet: { balance: number };
}

export interface GetMyTeamResponse {
  team: TeamInfo;
  members: TeamMember[];
  wallet: { balance: number };
}

export interface GetTeamResponse {
  team: TeamInfo;
  members: TeamMember[];
  wallet?: { balance: number };
}

export interface ContributeResponse {
  userWallet: { balance: number };
  teamWallet: { balance: number };
}

// ── Lobbies ─────────────────────────────────────────────────────────────────

export interface LobbyListItem {
  id: string;
  field: { id: string; name: string; location: string; city: string };
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

export interface LobbyParticipant {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  position: string | null;
  hasPaid: boolean;
  joinedAt: string;
}

export interface GetLobbyResponse {
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
  field: { id: string; name: string; location: string; city: string };
  timetable: { date: string; timeSlot: string };
  participants: LobbyParticipant[];
}

export interface CreateLobbyPayload {
  fieldId: string;
  timetableId: string;
  intensity?: string;
  maxPlayers?: number;
  feePerPlayer?: number;
}

export interface LobbyPayResponse {
  message: string;
  wallet: WalletInfo;
  lobbyStatus: string;
}

// ── Matches ─────────────────────────────────────────────────────────────────

export interface MatchListItem {
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
}

export interface MatchPlayer {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  teamSide: string;
  goals: number;
  assists: number;
  rating: number | null;
}

export interface GetMatchResponse {
  match: {
    id: string;
    lobbyId: string;
    date: string;
    scoreHome: number;
    scoreAway: number;
    status: string;
  };
  field: { id: string; name: string; location: string; city: string };
  players: MatchPlayer[];
  financials?: {
    totalCollected: number;
    fieldOwnerPayout: number;
    platformFee: number;
    payoutStatus: string;
  };
}

export interface CompleteMatchPayload {
  lobbyId: string;
  scoreHome?: number;
  scoreAway?: number;
  players?: {
    userId: string;
    teamSide?: string;
    goals?: number;
    assists?: number;
    rating?: number;
  }[];
}

export interface CompleteMatchResponse {
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
}

export interface PlayerStatsResponse {
  totalMatches: number;
  totalGoals: number;
  totalAssists: number;
  averageRating: number | null;
  wins: number;
  losses: number;
  draws: number;
}

// ── Payments ────────────────────────────────────────────────────────────────

export interface LoadFundsPayload {
  amount: number;
}

export interface LoadFundsResponse {
  message: string;
  wallet: WalletInfo;
}

// ── Social ──────────────────────────────────────────────────────────────────

export interface DiscoverUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  position: string | null;
  fitnessLevel: string | null;
  city: string | null;
}

export interface FriendRequest {
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
}

// ── Generic API error ───────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}
