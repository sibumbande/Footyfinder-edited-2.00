
export enum PlayerPosition {
  GK = 'Goalkeeper',
  DEF = 'Defender',
  MID = 'Midfielder',
  FWD = 'Forward'
}

export enum FitnessLevel {
  BEGINNER = 'Beginner (Casual)',
  INTERMEDIATE = 'Intermediate (Regular)',
  ADVANCED = 'Advanced (Competitive)',
  PRO = 'Pro (Elite)'
}

export enum MatchIntensity {
  CASUAL = 'Casual',
  BALANCED = 'Balanced',
  COMPETITIVE = 'Competitive'
}

export enum BookingStatus {
  AVAILABLE = 'Available',
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed'
}

export interface TimeSlot {
  time: string; 
  status: BookingStatus;
  pendingLobbiesCount: number;
  type?: 'Match' | 'Practice';
}

export interface WalletTransaction {
  id: string;
  type: 'Credit' | 'Debit' | 'Refund' | 'EscrowHold' | 'EscrowRelease' | 'EscrowRefund' | 'TeamContribution';
  amount: number;
  description: string;
  date: string;
  isPending?: boolean;
  relatedEntityId?: string;
}

export interface UserWallet {
  balance: number;
  escrow: number;
  transactions: WalletTransaction[];
}

export interface TeamWallet {
  balance: number;
  contributions: { memberId: string, name: string, amount: number }[];
}

export interface Team {
  id: string;
  name: string;
  homeColor: string;
  awayColor: string;
  members: SoccerProfile[];
  wallet: TeamWallet;
}

export interface SoccerProfile {
  id: string;
  fullName: string;
  position: PlayerPosition;
  avatar: string;
  isFriend?: boolean;
}

export interface MatchLobby {
  id: string;
  matchId?: string; 
  fieldName: string;
  fieldId: string;
  location: string;
  startTime: string; 
  date: string;
  intensity: MatchIntensity;
  joinedCount: number;
  paidCount: number; 
  totalSlots: number;
  price: number;
  duration: string;
  isConfirmed: boolean;
  isReported?: boolean;
  isTeamMatch?: boolean;
  teamAFunded?: boolean;
  teamBFunded?: boolean;
}

export interface PlayerStats {
  goals: number;
  assists: number;
  matchesPlayed: number;
}

export interface UserProfileData {
  id: string;
  fullName: string;
  dateOfBirth: string;
  position: PlayerPosition | '';
  fitnessLevel: FitnessLevel | '';
  yearsPlaying: number;
  facePhoto: File | null;
  idPhoto: File | null;
  facePhotoPreview?: string;
  idPhotoPreview?: string;
  wallet: UserWallet;
  stats: PlayerStats;
  avatar: string;
  friends: SoccerProfile[];
}

export interface FieldListing {
  id: string;
  name: string;
  location: string;
  pricePerPlayer: number;
  imageUrl: string;
  rating: number;
  nextMatchTime: string;
  playersJoined: number;
  maxPlayers: number;
  amenities: string[];
  timetable?: TimeSlot[];
}

export interface LobbyMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe?: boolean;
}

export interface PracticeSession {
  id: string;
  hostName: string;
  hostAvatar: string;
  hostType: 'GK' | 'Shooter';
  location: string;
  time: string;
  needed: 'GK' | 'Shooter';
  description: string;
}

export interface MatchRecord {
  id: string;
  lobbyId: string;
  date: string;
  fieldName: string;
  scoreA: number;
  scoreB: number;
  teamA: string[]; 
  teamB: string[];
  scorers: { playerId: string, goals: number }[];
  assisters: { playerId: string, assists: number }[];
  isDraft?: boolean;
}
