import { getStore, generateId } from './database';
import { WalletTransaction, UserWallet } from '../types';

export const walletService = {
  getBalance(userId: string): { balance: number; escrow: number } {
    const store = getStore();
    return store.userBalances[userId] || { balance: 0, escrow: 0 };
  },

  getWallet(userId: string): UserWallet {
    const bal = this.getBalance(userId);
    return {
      balance: bal.balance,
      escrow: bal.escrow,
      transactions: this.getTransactions(userId),
    };
  },

  getTransactions(userId: string): WalletTransaction[] {
    const store = getStore();
    return store.walletTransactions
      .filter(t => t.id.includes(userId) || store.walletTransactions.indexOf(t) >= 0)
      .filter(t => {
        // Filter by userId encoded in the relatedEntityId or by matching
        return (t as any)._userId === userId;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  _addTransaction(userId: string, tx: WalletTransaction): WalletTransaction {
    const store = getStore();
    (tx as any)._userId = userId;
    store.walletTransactions.push(tx);
    return tx;
  },

  loadFunds(userId: string, amount: number): WalletTransaction {
    if (amount <= 0) throw new Error('Amount must be positive');
    const store = getStore();
    if (!store.userBalances[userId]) {
      store.userBalances[userId] = { balance: 0, escrow: 0 };
    }
    store.userBalances[userId].balance += amount;

    return this._addTransaction(userId, {
      id: generateId('tx'),
      type: 'Credit',
      amount,
      description: 'Funds loaded to wallet',
      date: new Date().toISOString(),
      isPending: false,
    });
  },

  escrowHold(userId: string, amount: number, lobbyId: string): WalletTransaction {
    if (amount <= 0) throw new Error('Amount must be positive');
    const store = getStore();
    const bal = store.userBalances[userId];
    if (!bal || bal.balance < amount) {
      throw new Error(`Insufficient balance. Available: R${bal?.balance?.toFixed(2) || '0.00'}, Required: R${amount.toFixed(2)}`);
    }

    bal.balance -= amount;
    bal.escrow += amount;

    return this._addTransaction(userId, {
      id: generateId('esc'),
      type: 'EscrowHold',
      amount,
      description: `Match fee held in escrow`,
      date: new Date().toISOString(),
      isPending: true,
      relatedEntityId: lobbyId,
    });
  },

  escrowRelease(userId: string, amount: number, lobbyId: string): WalletTransaction {
    const store = getStore();
    const bal = store.userBalances[userId];
    if (bal) {
      bal.escrow = Math.max(0, bal.escrow - amount);
    }

    // Mark corresponding hold as no longer pending
    store.walletTransactions
      .filter(t => (t as any)._userId === userId && t.type === 'EscrowHold' && t.relatedEntityId === lobbyId && t.isPending)
      .forEach(t => { t.isPending = false; });

    return this._addTransaction(userId, {
      id: generateId('rel'),
      type: 'EscrowRelease',
      amount,
      description: 'Match confirmed - payment finalized',
      date: new Date().toISOString(),
      isPending: false,
      relatedEntityId: lobbyId,
    });
  },

  escrowRefund(userId: string, amount: number, lobbyId: string): WalletTransaction {
    const store = getStore();
    const bal = store.userBalances[userId];
    if (bal) {
      bal.escrow = Math.max(0, bal.escrow - amount);
      bal.balance += amount;
    }

    // Mark corresponding hold as no longer pending
    store.walletTransactions
      .filter(t => (t as any)._userId === userId && t.type === 'EscrowHold' && t.relatedEntityId === lobbyId && t.isPending)
      .forEach(t => { t.isPending = false; });

    return this._addTransaction(userId, {
      id: generateId('ref'),
      type: 'EscrowRefund',
      amount,
      description: 'Match cancelled - escrow refunded',
      date: new Date().toISOString(),
      isPending: false,
      relatedEntityId: lobbyId,
    });
  },

  directDebit(userId: string, amount: number, description: string, relatedId?: string): WalletTransaction {
    if (amount <= 0) throw new Error('Amount must be positive');
    const store = getStore();
    const bal = store.userBalances[userId];
    if (!bal || bal.balance < amount) {
      throw new Error(`Insufficient balance. Available: R${bal?.balance?.toFixed(2) || '0.00'}, Required: R${amount.toFixed(2)}`);
    }

    bal.balance -= amount;

    return this._addTransaction(userId, {
      id: generateId('deb'),
      type: 'Debit',
      amount,
      description,
      date: new Date().toISOString(),
      isPending: false,
      relatedEntityId: relatedId,
    });
  },

  contributeToTeam(userId: string, teamId: string, amount: number): WalletTransaction {
    if (amount <= 0) throw new Error('Amount must be positive');
    const store = getStore();
    const bal = store.userBalances[userId];
    if (!bal || bal.balance < amount) {
      throw new Error(`Insufficient balance. Available: R${bal?.balance?.toFixed(2) || '0.00'}, Required: R${amount.toFixed(2)}`);
    }

    bal.balance -= amount;

    // Add to team balance
    if (!store.teamBalances[teamId]) {
      store.teamBalances[teamId] = 0;
    }
    store.teamBalances[teamId] += amount;

    return this._addTransaction(userId, {
      id: generateId('team'),
      type: 'TeamContribution',
      amount,
      description: 'Team treasury contribution',
      date: new Date().toISOString(),
      isPending: false,
      relatedEntityId: teamId,
    });
  },

  getTeamBalance(teamId: string): number {
    return getStore().teamBalances[teamId] || 0;
  },

  debitTeamWallet(teamId: string, amount: number, description: string): void {
    const store = getStore();
    const current = store.teamBalances[teamId] || 0;
    if (current < amount) {
      throw new Error(`Insufficient team funds. Available: R${current.toFixed(2)}, Required: R${amount.toFixed(2)}`);
    }
    store.teamBalances[teamId] = current - amount;
  },
};
