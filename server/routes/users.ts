import { Router, Response } from 'express';
import { getDb } from '../db/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes in this file require authentication
router.use(authenticate);

// ── GET /me ──────────────────────────────────────────────────────────────────

router.get('/me', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const db = getDb();

    const user = db.prepare(
      `SELECT id, email, username, full_name, phone, avatar_url, position,
              fitness_level, bio, city, created_at, is_verified
       FROM users WHERE id = ?`
    ).get(userId) as Record<string, any> | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const wallet = db.prepare(
      'SELECT balance, escrow FROM wallets WHERE user_id = ?'
    ).get(userId) as { balance: number; escrow: number } | undefined;

    // Check if user belongs to a team
    const membership = db.prepare(
      `SELECT tm.role, t.id AS team_id, t.name AS team_name
       FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE tm.user_id = ?`
    ).get(userId) as { role: string; team_id: string; team_name: string } | undefined;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        position: user.position,
        fitnessLevel: user.fitness_level,
        bio: user.bio,
        city: user.city,
        createdAt: user.created_at,
        isVerified: user.is_verified === 1,
      },
      wallet: wallet ? { balance: wallet.balance, escrow: wallet.escrow } : { balance: 0, escrow: 0 },
      team: membership ? { id: membership.team_id, name: membership.team_name, role: membership.role } : null,
    });
  } catch (err: any) {
    console.error('[Users] GET /me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── PUT /me ──────────────────────────────────────────────────────────────────

router.put('/me', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { fullName, phone, avatarUrl, position, fitnessLevel, bio, city } = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (fullName !== undefined) { fields.push('full_name = ?'); values.push(fullName); }
    if (phone !== undefined)    { fields.push('phone = ?'); values.push(phone); }
    if (avatarUrl !== undefined) { fields.push('avatar_url = ?'); values.push(avatarUrl); }
    if (position !== undefined) { fields.push('position = ?'); values.push(position); }
    if (fitnessLevel !== undefined) { fields.push('fitness_level = ?'); values.push(fitnessLevel); }
    if (bio !== undefined)      { fields.push('bio = ?'); values.push(bio); }
    if (city !== undefined)     { fields.push('city = ?'); values.push(city); }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const db = getDb();
    values.push(userId);

    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    db.save();

    // Return updated user
    const user = db.prepare(
      `SELECT id, email, username, full_name, phone, avatar_url, position,
              fitness_level, bio, city, created_at
       FROM users WHERE id = ?`
    ).get(userId) as Record<string, any>;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        position: user.position,
        fitnessLevel: user.fitness_level,
        bio: user.bio,
        city: user.city,
        createdAt: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('[Users] PUT /me error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── POST /me/verify-id ───────────────────────────────────────────────────────

router.post('/me/verify-id', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { idPhotoBase64 } = req.body;

    if (!idPhotoBase64 || typeof idPhotoBase64 !== 'string') {
      res.status(400).json({ error: 'idPhotoBase64 is required' });
      return;
    }

    const db = getDb();
    db.prepare(
      'UPDATE users SET id_document_url = ?, is_verified = 1 WHERE id = ?'
    ).run(idPhotoBase64, userId);
    db.save();

    res.json({ isVerified: true });
  } catch (err: any) {
    console.error('[Users] POST /me/verify-id error:', err.message);
    res.status(500).json({ error: 'Failed to verify identity' });
  }
});

// ── GET /me/wallet ───────────────────────────────────────────────────────────

router.get('/me/wallet', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const db = getDb();

    const wallet = db.prepare(
      'SELECT id, balance, escrow FROM wallets WHERE user_id = ?'
    ).get(userId) as { id: string; balance: number; escrow: number } | undefined;

    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }

    const transactions = db.prepare(
      `SELECT id, type, amount, description, reference, created_at
       FROM transactions
       WHERE wallet_id = ?
       ORDER BY created_at DESC
       LIMIT 50`
    ).all(wallet.id) as Record<string, any>[];

    res.json({
      wallet: {
        balance: wallet.balance,
        escrow: wallet.escrow,
      },
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
    console.error('[Users] GET /me/wallet error:', err.message);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// ── GET /me/transactions ─────────────────────────────────────────────────────

router.get('/me/transactions', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const db = getDb();

    const wallet = db.prepare(
      'SELECT id FROM wallets WHERE user_id = ?'
    ).get(userId) as { id: string } | undefined;

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
    console.error('[Users] GET /me/transactions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────────

router.get('/:id', (req, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const user = db.prepare(
      `SELECT id, username, full_name, avatar_url, position, fitness_level, city, bio
       FROM users WHERE id = ?`
    ).get(id) as Record<string, any> | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        position: user.position,
        fitnessLevel: user.fitness_level,
        city: user.city,
        bio: user.bio,
      },
    });
  } catch (err: any) {
    console.error('[Users] GET /:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── GET /:id/reviews ────────────────────────────────────────────────────────

router.get('/:id/reviews', (req, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const reviews = db.prepare(
      `SELECT pr.id, pr.session_type, pr.session_id, pr.rating, pr.comment, pr.created_at,
              u.id AS reviewer_id, u.username AS reviewer_username, u.full_name AS reviewer_name, u.avatar_url AS reviewer_avatar
       FROM player_reviews pr
       JOIN users u ON u.id = pr.reviewer_id
       WHERE pr.reviewee_id = ?
       ORDER BY pr.created_at DESC`
    ).all(id) as Record<string, any>[];

    // Calculate averages
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : null;

    res.json({
      reviews: reviews.map(r => ({
        id: r.id,
        sessionType: r.session_type,
        sessionId: r.session_id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
        reviewer: {
          id: r.reviewer_id,
          username: r.reviewer_username,
          fullName: r.reviewer_name,
          avatarUrl: r.reviewer_avatar,
        },
      })),
      averageRating,
      totalReviews,
    });
  } catch (err: any) {
    console.error('[Users] GET /:id/reviews error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ── GET /:id/training-stats ─────────────────────────────────────────────────

router.get('/:id/training-stats', (req, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const stats = db.prepare(
      `SELECT count(*) AS total_sessions
       FROM practice_participants pp
       JOIN practice_sessions ps ON ps.id = pp.session_id
       WHERE pp.user_id = ? AND ps.status IN ('CONFIRMED', 'COMPLETED')`
    ).get(id) as { total_sessions: number };

    res.json({
      trainingSessions: stats.total_sessions,
    });
  } catch (err: any) {
    console.error('[Users] GET /:id/training-stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch training stats' });
  }
});

export default router;
