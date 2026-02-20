import { Router, Response } from 'express';
import { getDb } from '../db/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── POST /load — Load funds into wallet ─────────────────────────────────────

router.post('/load', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number' });
      return;
    }

    const db = getDb();

    const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(userId) as { id: string; balance: number } | undefined;

    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }

    db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(amount, wallet.id);

    db.prepare(
      `INSERT INTO transactions (id, wallet_id, type, amount, description)
       VALUES (?, ?, 'DEPOSIT', ?, ?)`
    ).run(uid('tx'), wallet.id, amount, `Loaded R${amount.toFixed(2)} into wallet`);

    db.save();

    const updated = db.prepare('SELECT balance, escrow FROM wallets WHERE id = ?').get(wallet.id) as { balance: number; escrow: number };

    res.json({
      message: `R${amount.toFixed(2)} loaded successfully`,
      wallet: { balance: updated.balance, escrow: updated.escrow },
    });
  } catch (err: any) {
    console.error('[Payments] POST /load error:', err.message);
    res.status(500).json({ error: 'Failed to load funds' });
  }
});

// ── GET /transactions — User's transaction history ──────────────────────────

router.get('/transactions', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const db = getDb();

    const wallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(userId) as { id: string } | undefined;

    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }

    const transactions = db.prepare(
      `SELECT id, type, amount, description, reference, created_at
       FROM transactions
       WHERE wallet_id = ?
       ORDER BY created_at DESC`
    ).all(wallet.id) as Record<string, any>[];

    res.json({
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        reference: t.reference,
        createdAt: t.created_at,
      })),
    });
  } catch (err: any) {
    console.error('[Payments] GET /transactions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
