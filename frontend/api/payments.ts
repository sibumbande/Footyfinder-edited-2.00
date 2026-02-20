import { api } from './client';

export function loadFunds(amount: number) {
  return api.post<{
    message: string;
    wallet: { balance: number; escrow: number };
  }>('/payments/load', { amount });
}

export function getTransactions() {
  return api.get<{
    transactions: {
      id: string;
      type: string;
      amount: number;
      description: string;
      reference: string | null;
      createdAt: string;
    }[];
  }>('/payments/transactions');
}
