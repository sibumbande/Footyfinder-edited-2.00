import { Router, Response } from 'express';
import { getDb } from '../db/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── GET /discover — Discover users (not already friends) ────────────────────

router.get('/discover', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { city, position } = req.query;
    const db = getDb();

    let sql = `SELECT u.id, u.username, u.full_name, u.avatar_url, u.position, u.fitness_level, u.city
               FROM users u
               WHERE u.id != ?
                 AND u.id NOT IN (
                   SELECT addressee_id FROM friendships WHERE requester_id = ? AND status IN ('PENDING', 'ACCEPTED')
                   UNION
                   SELECT requester_id FROM friendships WHERE addressee_id = ? AND status IN ('PENDING', 'ACCEPTED')
                 )`;
    const params: any[] = [userId, userId, userId];

    if (city && typeof city === 'string') {
      sql += ' AND u.city = ?';
      params.push(city);
    }
    if (position && typeof position === 'string') {
      sql += ' AND u.position = ?';
      params.push(position);
    }

    sql += ' ORDER BY u.full_name LIMIT 50';

    const users = db.prepare(sql).all(...params) as Record<string, any>[];

    res.json({
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        fullName: u.full_name,
        avatarUrl: u.avatar_url,
        position: u.position,
        fitnessLevel: u.fitness_level,
        city: u.city,
      })),
    });
  } catch (err: any) {
    console.error('[Social] GET /discover error:', err.message);
    res.status(500).json({ error: 'Failed to discover users' });
  }
});

// ── POST /friend-request — Send friend request ─────────────────────────────

router.post('/friend-request', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { addresseeId } = req.body;
    const db = getDb();

    if (!addresseeId) {
      res.status(400).json({ error: 'addresseeId is required' });
      return;
    }

    if (addresseeId === userId) {
      res.status(400).json({ error: 'Cannot send friend request to yourself' });
      return;
    }

    // Check addressee exists
    const addressee = db.prepare('SELECT id, full_name FROM users WHERE id = ?').get(addresseeId) as { id: string; full_name: string } | undefined;
    if (!addressee) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check no existing friendship in either direction
    const existing = db.prepare(
      `SELECT id, status FROM friendships
       WHERE (requester_id = ? AND addressee_id = ?)
          OR (requester_id = ? AND addressee_id = ?)`
    ).get(userId, addresseeId, addresseeId, userId) as { id: string; status: string } | undefined;

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        res.status(400).json({ error: 'You are already friends' });
      } else if (existing.status === 'PENDING') {
        res.status(400).json({ error: 'Friend request already pending' });
      } else {
        // DECLINED — allow re-sending by updating
        db.prepare('UPDATE friendships SET status = ?, requester_id = ?, addressee_id = ?, created_at = datetime(?) WHERE id = ?')
          .run('PENDING', userId, addresseeId, 'now', existing.id);
        db.save();
        res.json({ message: `Friend request re-sent to ${addressee.full_name}`, requestId: existing.id });
      }
      return;
    }

    const requestId = uid('fr');
    db.prepare(
      `INSERT INTO friendships (id, requester_id, addressee_id, status)
       VALUES (?, ?, ?, 'PENDING')`
    ).run(requestId, userId, addresseeId);

    db.save();

    // Notify the addressee
    const sender = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId) as { full_name: string } | undefined;
    createNotification(db, {
      userId: addresseeId,
      type: 'FRIEND_REQUEST',
      title: 'New Friend Request',
      body: `${sender?.full_name ?? 'Someone'} sent you a friend request`,
      relatedEntityId: requestId,
    });

    res.status(201).json({ message: `Friend request sent to ${addressee.full_name}`, requestId });
  } catch (err: any) {
    console.error('[Social] POST /friend-request error:', err.message);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// ── PUT /friend-request/:id — Accept or decline ────────────────────────────

router.put('/friend-request/:id', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const { status } = req.body;
    const db = getDb();

    if (!status || !['ACCEPTED', 'DECLINED'].includes(status)) {
      res.status(400).json({ error: 'status must be ACCEPTED or DECLINED' });
      return;
    }

    const request = db.prepare(
      'SELECT id, requester_id, addressee_id, status FROM friendships WHERE id = ?'
    ).get(id) as { id: string; requester_id: string; addressee_id: string; status: string } | undefined;

    if (!request) {
      res.status(404).json({ error: 'Friend request not found' });
      return;
    }

    // Only the addressee can accept/decline
    if (request.addressee_id !== userId) {
      res.status(403).json({ error: 'Only the recipient can respond to this request' });
      return;
    }

    if (request.status !== 'PENDING') {
      res.status(400).json({ error: `Request already ${request.status.toLowerCase()}` });
      return;
    }

    db.prepare('UPDATE friendships SET status = ? WHERE id = ?').run(status, id);
    db.save();

    if (status === 'ACCEPTED') {
      const accepter = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId) as { full_name: string } | undefined;
      createNotification(db, {
        userId: request.requester_id,
        type: 'FRIEND_ACCEPTED',
        title: 'Friend Request Accepted',
        body: `${accepter?.full_name ?? 'Someone'} accepted your friend request`,
        relatedEntityId: id,
      });
    }

    res.json({ message: `Friend request ${status.toLowerCase()}` });
  } catch (err: any) {
    console.error('[Social] PUT /friend-request/:id error:', err.message);
    res.status(500).json({ error: 'Failed to update friend request' });
  }
});

// ── GET /friends — List accepted friends ────────────────────────────────────

router.get('/friends', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const db = getDb();

    const friends = db.prepare(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.position, u.fitness_level, u.city
       FROM friendships f
       JOIN users u ON u.id = CASE
         WHEN f.requester_id = ? THEN f.addressee_id
         ELSE f.requester_id
       END
       WHERE (f.requester_id = ? OR f.addressee_id = ?)
         AND f.status = 'ACCEPTED'
       ORDER BY u.full_name`
    ).all(userId, userId, userId) as Record<string, any>[];

    res.json({
      friends: friends.map(u => ({
        id: u.id,
        username: u.username,
        fullName: u.full_name,
        avatarUrl: u.avatar_url,
        position: u.position,
        fitnessLevel: u.fitness_level,
        city: u.city,
      })),
    });
  } catch (err: any) {
    console.error('[Social] GET /friends error:', err.message);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// ── GET /friend-requests — Pending requests for current user ────────────────

router.get('/friend-requests', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const db = getDb();

    const requests = db.prepare(
      `SELECT f.id AS request_id, f.status, f.created_at,
              u.id AS user_id, u.username, u.full_name, u.avatar_url, u.position
       FROM friendships f
       JOIN users u ON u.id = f.requester_id
       WHERE f.addressee_id = ? AND f.status = 'PENDING'
       ORDER BY f.created_at DESC`
    ).all(userId) as Record<string, any>[];

    res.json({
      requests: requests.map(r => ({
        requestId: r.request_id,
        status: r.status,
        createdAt: r.created_at,
        from: {
          id: r.user_id,
          username: r.username,
          fullName: r.full_name,
          avatarUrl: r.avatar_url,
          position: r.position,
        },
      })),
    });
  } catch (err: any) {
    console.error('[Social] GET /friend-requests error:', err.message);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

export default router;
