import { getStore, generateId } from './database';
import { walletService } from './walletService';
import { MatchLobby } from '../types';

export const lobbyService = {
  getActiveLobbies(): MatchLobby[] {
    return getStore().lobbies.filter(l => !l.isConfirmed);
  },

  getLobby(lobbyId: string): MatchLobby | undefined {
    return getStore().lobbies.find(l => l.id === lobbyId);
  },

  joinSlot(lobbyId: string, userId: string, positionSlot: string, price: number) {
    const tx = walletService.escrowHold(userId, price, lobbyId);

    const store = getStore();
    store.lobbyParticipants.push({
      id: generateId('lp'),
      lobbyId,
      userId,
      positionSlot,
      hasPaid: true,
      escrowTransactionId: tx.id,
      joinedAt: new Date().toISOString(),
    });

    // Update lobby counts
    const lobby = store.lobbies.find(l => l.id === lobbyId);
    if (lobby) {
      lobby.joinedCount += 1;
      lobby.paidCount += 1;
    }

    return { transaction: tx, lobby };
  },

  confirmLobby(lobbyId: string): MatchLobby | null {
    const store = getStore();
    const lobby = store.lobbies.find(l => l.id === lobbyId);
    if (!lobby || lobby.isConfirmed) return lobby || null;

    lobby.matchId = `FF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    lobby.isConfirmed = true;

    // Release escrow for all participants
    const participants = store.lobbyParticipants.filter(p => p.lobbyId === lobbyId && p.hasPaid);
    participants.forEach(p => {
      walletService.escrowRelease(p.userId, lobby.price, lobbyId);
    });

    return lobby;
  },

  cancelLobby(lobbyId: string): void {
    const store = getStore();
    const lobby = store.lobbies.find(l => l.id === lobbyId);
    if (!lobby) return;

    // Refund escrow for all participants
    const participants = store.lobbyParticipants.filter(p => p.lobbyId === lobbyId && p.hasPaid);
    participants.forEach(p => {
      walletService.escrowRefund(p.userId, lobby.price, lobbyId);
    });

    // Remove lobby
    store.lobbies = store.lobbies.filter(l => l.id !== lobbyId);
  },
};
