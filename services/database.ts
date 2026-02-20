import { FieldListing, MatchLobby, SoccerProfile, PracticeSession, WalletTransaction } from '../types';

// ── SQLite-compatible schema interfaces ──
// Each interface maps to a future SQLite table.
// The in-memory store below mirrors a database with typed arrays.

export interface DbLobbyParticipant {
  id: string;
  lobbyId: string;
  userId: string;
  positionSlot: string;
  hasPaid: boolean;
  escrowTransactionId: string | null;
  joinedAt: string;
}

export interface DbMessage {
  id: string;
  contextType: 'lobby' | 'team' | 'training';
  contextId: string;
  senderId: string;
  senderName: string;
  text: string;
  isSystem: boolean;
  createdAt: string;
}

export interface DbTeamWalletContribution {
  id: string;
  teamId: string;
  memberId: string;
  memberName: string;
  amount: number;
  createdAt: string;
}

// ── The in-memory data store (mirrors SQLite tables) ──

export interface DataStore {
  fields: FieldListing[];
  lobbies: MatchLobby[];
  lobbyParticipants: DbLobbyParticipant[];
  profiles: SoccerProfile[];
  practiceSessions: PracticeSession[];
  walletTransactions: WalletTransaction[];
  messages: DbMessage[];
  teamWalletContributions: DbTeamWalletContribution[];
  // User balances keyed by userId
  userBalances: Record<string, { balance: number; escrow: number }>;
  // Team balances keyed by teamId
  teamBalances: Record<string, number>;
  // Initial squad pool
  squadPool: { id: string; name: string; role: string }[];
  // Captain messages (team chat seed)
  captainMessages: { id: string; senderId: string; senderName: string; text: string; timestamp: string }[];
}

let store: DataStore = {
  fields: [],
  lobbies: [],
  lobbyParticipants: [],
  profiles: [],
  practiceSessions: [],
  walletTransactions: [],
  messages: [],
  teamWalletContributions: [],
  userBalances: {},
  teamBalances: {},
  squadPool: [],
  captainMessages: [],
};

export const getStore = (): DataStore => store;
export const setStore = (newStore: DataStore): void => { store = newStore; };

// Helper to generate DB-safe IDs
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
