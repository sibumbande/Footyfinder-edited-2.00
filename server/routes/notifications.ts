
import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getDb } from '../db/database.js';

function uid() {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const router = Router();
router.use(authenticate);

// ── Helper exported for use in other route files ──────────────────────────

export interface NotificationPayload {
  userId: string;
  type:
    | 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED'
    | 'TEAM_INVITE' | 'TEAM_JOIN_ACCEPTED' | 'TEAM_JOIN_DECLINED' | 'TEAM_JOIN_REQUEST'
    | 'MATCH_TODAY' | 'TEAM_MESSAGE' | 'TEAM_BIO_UPDATE' | 'DM_REQUEST' | 'LOBBY_CANCELLED';
  title: string;
  body: string;
  relatedEntityId?: string;
}

export function createNotification(db: ReturnType<typeof getDb>, payload: NotificationPayload) {
  try {
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, body, related_entity_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(uid(), payload.userId, payload.type, payload.title, payload.body, payload.relatedEntityId ?? null);
  } catch {
    // Non-critical — never block main flow for notification errors
  }
}

// ── GET /notifications — last 50 for current user ────────────────────────

router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userId = req.userId!;
  try {
    const rows = db.prepare(`
      SELECT id, type, title, body, is_read, related_entity_id, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(userId) as {
      id: string; type: string; title: string; body: string;
      is_read: number; related_entity_id: string | null; created_at: string;
    }[];

    const notifications = rows.map(r => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      isRead: r.is_read === 1,
      relatedEntityId: r.related_entity_id ?? undefined,
      createdAt: r.created_at,
    }));

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ── PUT /notifications/:id/read ───────────────────────────────────────────

router.put('/:id/read', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userId = req.userId!;
  const { id } = req.params;
  try {
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(id, userId);
    res.json({ message: 'Marked as read' });
  } catch {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// ── PUT /notifications/read-all ───────────────────────────────────────────

router.put('/read-all', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userId = req.userId!;
  try {
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(userId);
    res.json({ message: 'All notifications marked as read' });
  } catch {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

export default router;
