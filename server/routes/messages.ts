import { Router, Response } from 'express';
import { getDb } from '../db/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function areFriends(db: ReturnType<typeof getDb>, userA: string, userB: string): boolean {
  const row = db.prepare(
    `SELECT id FROM friendships
     WHERE status = 'ACCEPTED'
       AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`
  ).get(userA, userB, userB, userA);
  return !!row;
}

// ── GET /conversations — list all DM conversations for current user ──────────

router.get('/conversations', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const db = getDb();

    // Get all distinct partners (sent or received)
    const partners = db.prepare(
      `SELECT DISTINCT
         CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id
       FROM messages
       WHERE receiver_id IS NOT NULL
         AND (sender_id = ? OR receiver_id = ?)`
    ).all(userId, userId, userId) as { partner_id: string }[];

    const conversations = partners
      .filter(p => p.partner_id)
      .map(p => {
        const partner = db.prepare(
          'SELECT id, full_name, avatar_url, is_verified FROM users WHERE id = ?'
        ).get(p.partner_id) as { id: string; full_name: string; avatar_url: string | null; is_verified: number } | undefined;

        if (!partner) return null;

        const lastMsg = db.prepare(
          `SELECT content, created_at, is_request FROM messages
           WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
             AND receiver_id IS NOT NULL
           ORDER BY created_at DESC LIMIT 1`
        ).get(userId, partner.id, partner.id, userId) as { content: string; created_at: string; is_request: number } | undefined;

        const unreadCount = db.prepare(
          `SELECT count(*) as cnt FROM messages
           WHERE sender_id = ? AND receiver_id = ? AND is_request = 0`
        ).get(partner.id, userId) as { cnt: number };

        const isPending = db.prepare(
          `SELECT id FROM messages
           WHERE sender_id = ? AND receiver_id = ? AND is_request = 1`
        ).get(partner.id, userId);

        return {
          userId: partner.id,
          fullName: partner.full_name,
          avatar: partner.avatar_url || null,
          isVerified: partner.is_verified === 1,
          lastMessage: lastMsg?.content || '',
          lastAt: lastMsg?.created_at || '',
          unreadCount: unreadCount?.cnt || 0,
          isPending: !!isPending,
        };
      })
      .filter(Boolean);

    res.json({ conversations });
  } catch (err: any) {
    console.error('[Messages] GET /conversations error:', err.message);
    res.status(500).json({ error: 'Failed to load conversations' });
  }
});

// ── GET /dm/:userId — get full DM history with a specific user ───────────────

router.get('/dm/:userId', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { userId: targetId } = req.params;
    const db = getDb();

    const rows = db.prepare(
      `SELECT m.id, m.sender_id, m.content, m.created_at, m.is_request,
              u.full_name AS sender_name, u.avatar_url AS sender_avatar
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
         AND m.receiver_id IS NOT NULL
       ORDER BY m.created_at ASC`
    ).all(userId, targetId, targetId, userId) as Record<string, any>[];

    const messages = rows.map(r => ({
      id: r.id,
      senderId: r.sender_id,
      senderName: r.sender_name,
      senderAvatar: r.sender_avatar || null,
      recipientId: r.sender_id === userId ? targetId : userId,
      content: r.content,
      createdAt: r.created_at,
      isRequest: r.is_request === 1,
    }));

    res.json({ messages });
  } catch (err: any) {
    console.error('[Messages] GET /dm/:userId error:', err.message);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// ── POST /dm/:userId — send a DM (or message request if not friends) ─────────

router.post('/dm/:userId', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { userId: targetId } = req.params;
    const { content } = req.body;
    const db = getDb();

    if (!content || typeof content !== 'string' || !content.trim()) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const friends = areFriends(db, userId, targetId);

    // Check if there's an existing accepted DM conversation
    const existingMsg = db.prepare(
      `SELECT id FROM messages
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND is_request = 0 AND receiver_id IS NOT NULL
       LIMIT 1`
    ).get(userId, targetId, targetId, userId);

    // Also check if a pending request already exists (from us to them)
    const pendingRequest = db.prepare(
      `SELECT id FROM messages WHERE sender_id = ? AND receiver_id = ? AND is_request = 1 LIMIT 1`
    ).get(userId, targetId);

    if (!friends && !existingMsg && pendingRequest) {
      res.status(400).json({ error: 'A message request is already pending.' });
      return;
    }

    const isRequest = !friends && !existingMsg ? 1 : 0;
    const msgId = uid('msg');

    db.prepare(
      `INSERT INTO messages (id, sender_id, receiver_id, content, is_request) VALUES (?, ?, ?, ?, ?)`
    ).run(msgId, userId, targetId, content.trim(), isRequest);

    db.save();

    res.status(201).json({
      message: {
        id: msgId,
        senderId: userId,
        recipientId: targetId,
        content: content.trim(),
        isRequest: isRequest === 1,
        createdAt: new Date().toISOString(),
      },
      isRequest: isRequest === 1,
    });
  } catch (err: any) {
    console.error('[Messages] POST /dm/:userId error:', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ── PUT /dm/:userId/accept — accept a message request ────────────────────────

router.put('/dm/:userId/accept', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { userId: senderId } = req.params;
    const db = getDb();

    // Clear is_request flag — conversation now open
    db.prepare(
      `UPDATE messages SET is_request = 0 WHERE sender_id = ? AND receiver_id = ? AND is_request = 1`
    ).run(senderId, userId);

    db.save();
    res.json({ message: 'Message request accepted' });
  } catch (err: any) {
    console.error('[Messages] PUT /dm/:userId/accept error:', err.message);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// ── PUT /dm/:userId/decline — decline a message request ──────────────────────

router.put('/dm/:userId/decline', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { userId: senderId } = req.params;
    const db = getDb();

    db.prepare(
      `DELETE FROM messages WHERE sender_id = ? AND receiver_id = ? AND is_request = 1`
    ).run(senderId, userId);

    db.save();
    res.json({ message: 'Message request declined' });
  } catch (err: any) {
    console.error('[Messages] PUT /dm/:userId/decline error:', err.message);
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

export default router;
