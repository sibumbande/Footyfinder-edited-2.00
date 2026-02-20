import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Parse timetable_ids stored as JSON array or legacy single ID */
function parseTimetableIds(raw: any): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; } catch {}
    return [raw]; // legacy single ID
  }
  return [];
}

function getSessionWithCounts(sessionId: string) {
  const db = getDb();
  return db.prepare(
    `SELECT ps.*,
            f.name AS field_name, f.location AS field_location, f.city AS field_city,
            u.full_name AS creator_name, u.avatar_url AS creator_avatar,
            (SELECT count(*) FROM practice_participants pp WHERE pp.session_id = ps.id) AS participant_count,
            (SELECT count(*) FROM practice_participants pp WHERE pp.session_id = ps.id AND pp.has_paid = 1) AS paid_count
     FROM practice_sessions ps
     LEFT JOIN fields f ON f.id = ps.field_id
     JOIN users u ON u.id = ps.created_by
     WHERE ps.id = ?`
  ).get(sessionId) as Record<string, any> | undefined;
}

function recalcSessionStatus(sessionId: string) {
  const db = getDb();
  const session = db.prepare('SELECT max_players, status FROM practice_sessions WHERE id = ?').get(sessionId) as any;
  if (!session || session.status === 'DRAFT' || session.status === 'CONFIRMED' || session.status === 'CANCELLED' || session.status === 'COMPLETED') return;

  const count = db.prepare('SELECT count(*) AS c FROM practice_participants WHERE session_id = ?').get(sessionId) as { c: number };

  let newStatus: string;
  if (count.c === 0) newStatus = 'OPEN';
  else if (count.c >= session.max_players) newStatus = 'FULL';
  else newStatus = 'FILLING';

  db.prepare('UPDATE practice_sessions SET status = ? WHERE id = ?').run(newStatus, sessionId);
}

function formatSession(r: Record<string, any>) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    date: r.date,
    timeSlot: r.time_slot,
    location: r.location,
    slotsCount: r.slots_count ?? 1,
    feePerPlayer: r.fee_per_player,
    maxPlayers: r.max_players,
    status: r.status,
    participantCount: r.participant_count,
    paidCount: r.paid_count,
    createdBy: r.created_by,
    creatorName: r.creator_name,
    creatorAvatar: r.creator_avatar,
    field: r.field_id ? { id: r.field_id, name: r.field_name, location: r.field_location, city: r.field_city } : null,
    createdAt: r.created_at,
  };
}

// ── GET / — List open/active training sessions (public) ─────────────────────
// Does NOT return DRAFT sessions — those are only visible to the host.

router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { city, date } = req.query;

    let sql = `SELECT ps.*,
                      f.name AS field_name, f.location AS field_location, f.city AS field_city,
                      u.full_name AS creator_name, u.avatar_url AS creator_avatar,
                      (SELECT count(*) FROM practice_participants pp WHERE pp.session_id = ps.id) AS participant_count,
                      (SELECT count(*) FROM practice_participants pp WHERE pp.session_id = ps.id AND pp.has_paid = 1) AS paid_count
               FROM practice_sessions ps
               LEFT JOIN fields f ON f.id = ps.field_id
               JOIN users u ON u.id = ps.created_by
               WHERE ps.status IN ('OPEN', 'FILLING', 'FULL', 'CONFIRMED')`;

    const params: any[] = [];

    if (city && typeof city === 'string') { sql += ' AND (f.city = ? OR ps.location LIKE ?)'; params.push(city, `%${city}%`); }
    if (date && typeof date === 'string') { sql += ' AND ps.date = ?'; params.push(date); }

    sql += ' ORDER BY ps.date, ps.time_slot';

    const rows = db.prepare(sql).all(...params) as Record<string, any>[];

    res.json({ sessions: rows.map(formatSession) });
  } catch (err: any) {
    console.error('[Training] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch training sessions' });
  }
});

// ── GET /:id — Session details with participants (public) ───────────────────

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const row = getSessionWithCounts(id);
    if (!row) {
      res.status(404).json({ error: 'Training session not found' });
      return;
    }

    const participants = db.prepare(
      `SELECT u.id AS user_id, u.username, u.full_name, u.avatar_url, u.position,
              pp.has_paid, pp.joined_at
       FROM practice_participants pp
       JOIN users u ON u.id = pp.user_id
       WHERE pp.session_id = ?
       ORDER BY pp.joined_at`
    ).all(id) as Record<string, any>[];

    res.json({
      session: formatSession(row),
      participants: participants.map(p => ({
        userId: p.user_id,
        username: p.username,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        position: p.position,
        hasPaid: !!p.has_paid,
        joinedAt: p.joined_at,
      })),
    });
  } catch (err: any) {
    console.error('[Training] GET /:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch training session' });
  }
});

// ── POST / — Create a training session (protected) ──────────────────────────
// Creates with status DRAFT. Host must call POST /:id/post to make it visible.
// fee_per_player = 20 * slotsCount

router.post('/', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { title, fieldId, timetableIds, date, timeSlot, location, maxPlayers, description } = req.body;
    const db = getDb();

    if (!title || !date || !timeSlot) {
      res.status(400).json({ error: 'title, date, and timeSlot are required' });
      return;
    }

    // timetableIds should be an array of slot IDs (1 or more)
    const slotIds: string[] = Array.isArray(timetableIds) ? timetableIds : (timetableIds ? [timetableIds] : []);
    const slotsCount = Math.max(slotIds.length, 1);
    const feePerPlayer = 20.0 * slotsCount;

    // Validate and reserve all timetable slots
    if (fieldId && slotIds.length > 0) {
      const field = db.prepare('SELECT id FROM fields WHERE id = ? AND is_active = 1').get(fieldId);
      if (!field) {
        res.status(404).json({ error: 'Field not found' });
        return;
      }

      for (const slotId of slotIds) {
        const slot = db.prepare(
          'SELECT id, status FROM field_timetable WHERE id = ? AND field_id = ?'
        ).get(slotId, fieldId) as Record<string, any> | undefined;

        if (!slot) {
          res.status(404).json({ error: `Timetable slot ${slotId} not found` });
          return;
        }

        if (slot.status !== 'AVAILABLE') {
          res.status(400).json({ error: `Slot ${slotId} is not available (current status: ${slot.status})` });
          return;
        }
      }

      // Reserve all slots
      for (const slotId of slotIds) {
        db.prepare('UPDATE field_timetable SET status = ? WHERE id = ?').run('RESERVED', slotId);
      }
    }

    const sessionId = uid('train');
    const participantId = uid('tp');

    // Create session — status starts as OPEN
    db.prepare(
      `INSERT INTO practice_sessions (id, created_by, field_id, timetable_ids, title, description, date, time_slot, location, slots_count, fee_per_player, max_players, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`
    ).run(
      sessionId, userId,
      fieldId || null,
      slotIds.length > 0 ? JSON.stringify(slotIds) : null,
      title,
      description || null,
      date, timeSlot,
      location || null,
      slotsCount,
      feePerPlayer,
      maxPlayers || 20
    );

    // Auto-add creator as first participant (unpaid)
    db.prepare(
      `INSERT INTO practice_participants (id, session_id, user_id, has_paid)
       VALUES (?, ?, ?, 0)`
    ).run(participantId, sessionId, userId);

    db.save();

    const session = getSessionWithCounts(sessionId);

    res.status(201).json({ session: formatSession(session!) });
  } catch (err: any) {
    console.error('[Training] POST / error:', err.message);
    res.status(500).json({ error: 'Failed to create training session' });
  }
});

// ── POST /:id/post — Post session to lobby (creator only, DRAFT → OPEN) ────

router.post('/:id/post', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const session = db.prepare(
      'SELECT id, created_by, status FROM practice_sessions WHERE id = ?'
    ).get(id) as Record<string, any> | undefined;

    if (!session) {
      res.status(404).json({ error: 'Training session not found' });
      return;
    }

    if (session.created_by !== userId) {
      res.status(403).json({ error: 'Only the session creator can post it to the lobby' });
      return;
    }

    if (session.status !== 'DRAFT' && session.status !== 'OPEN') {
      res.status(400).json({ error: `Session is already ${session.status.toLowerCase()}, cannot post again` });
      return;
    }

    // Ensure status is OPEN (handles both DRAFT→OPEN and OPEN→OPEN no-op)
    if (session.status === 'DRAFT') {
      db.prepare('UPDATE practice_sessions SET status = ? WHERE id = ?').run('OPEN', id);
      db.save();
    }

    const updated = getSessionWithCounts(id);

    res.json({
      message: 'Training session posted to lobby',
      session: formatSession(updated!),
    });
  } catch (err: any) {
    console.error('[Training] POST /:id/post error:', err.message);
    res.status(500).json({ error: 'Failed to post training session' });
  }
});

// ── POST /:id/join — Join a session (protected) ────────────────────────────

router.post('/:id/join', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const session = db.prepare('SELECT id, status, max_players FROM practice_sessions WHERE id = ?').get(id) as Record<string, any> | undefined;

    if (!session) {
      res.status(404).json({ error: 'Training session not found' });
      return;
    }

    if (session.status !== 'OPEN' && session.status !== 'FILLING') {
      res.status(400).json({ error: `Cannot join session with status ${session.status}` });
      return;
    }

    const existing = db.prepare(
      'SELECT id FROM practice_participants WHERE session_id = ? AND user_id = ?'
    ).get(id, userId);

    if (existing) {
      res.status(400).json({ error: 'You have already joined this session' });
      return;
    }

    const count = db.prepare('SELECT count(*) AS c FROM practice_participants WHERE session_id = ?').get(id) as { c: number };
    if (count.c >= session.max_players) {
      res.status(400).json({ error: 'Session is full' });
      return;
    }

    db.prepare(
      `INSERT INTO practice_participants (id, session_id, user_id, has_paid)
       VALUES (?, ?, ?, 0)`
    ).run(uid('tp'), id, userId);

    recalcSessionStatus(id);
    db.save();

    const updated = getSessionWithCounts(id);

    res.json({
      message: 'Joined training session',
      session: formatSession(updated!),
    });
  } catch (err: any) {
    console.error('[Training] POST /:id/join error:', err.message);
    res.status(500).json({ error: 'Failed to join training session' });
  }
});

// ── POST /:id/pay — Pay training fee with escrow (protected) ───────────────
// NO auto-confirm — the host must explicitly confirm.

router.post('/:id/pay', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const session = db.prepare(
      'SELECT id, fee_per_player, max_players, status FROM practice_sessions WHERE id = ?'
    ).get(id) as Record<string, any> | undefined;

    if (!session) {
      res.status(404).json({ error: 'Training session not found' });
      return;
    }

    if (session.status === 'CANCELLED' || session.status === 'COMPLETED') {
      res.status(400).json({ error: `Cannot pay for ${session.status.toLowerCase()} session` });
      return;
    }

    const participant = db.prepare(
      'SELECT id, has_paid FROM practice_participants WHERE session_id = ? AND user_id = ?'
    ).get(id, userId) as { id: string; has_paid: number } | undefined;

    if (!participant) {
      res.status(400).json({ error: 'You are not a participant in this session. Join first.' });
      return;
    }

    if (participant.has_paid) {
      res.status(400).json({ error: 'You have already paid' });
      return;
    }

    const fee = session.fee_per_player;

    const wallet = db.prepare(
      'SELECT id, balance, escrow FROM wallets WHERE user_id = ?'
    ).get(userId) as { id: string; balance: number; escrow: number } | undefined;

    if (!wallet || wallet.balance < fee) {
      res.status(400).json({ error: `Insufficient funds. Need R${fee.toFixed(2)}, have R${(wallet?.balance ?? 0).toFixed(2)}` });
      return;
    }

    // Move funds from balance to escrow
    db.prepare('UPDATE wallets SET balance = balance - ?, escrow = escrow + ? WHERE id = ?')
      .run(fee, fee, wallet.id);

    // Create ESCROW_HOLD transaction
    db.prepare(
      `INSERT INTO transactions (id, wallet_id, type, amount, description, reference)
       VALUES (?, ?, 'ESCROW_HOLD', ?, ?, ?)`
    ).run(uid('tx'), wallet.id, -fee, `Training fee for session ${id}`, id);

    // Mark as paid
    db.prepare('UPDATE practice_participants SET has_paid = 1, payment_reference = ? WHERE id = ?')
      .run(id, participant.id);

    recalcSessionStatus(id);
    db.save();

    const updatedWallet = db.prepare('SELECT balance, escrow FROM wallets WHERE id = ?').get(wallet.id) as { balance: number; escrow: number };
    const updatedSession = getSessionWithCounts(id);

    res.json({
      message: 'Payment successful',
      wallet: { balance: updatedWallet.balance, escrow: updatedWallet.escrow },
      sessionStatus: updatedSession?.status ?? session.status,
    });
  } catch (err: any) {
    console.error('[Training] POST /:id/pay error:', err.message);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// ── POST /:id/leave — Leave a session (protected) ──────────────────────────

router.post('/:id/leave', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const session = db.prepare(
      'SELECT id, created_by, fee_per_player, status FROM practice_sessions WHERE id = ?'
    ).get(id) as Record<string, any> | undefined;

    if (!session) {
      res.status(404).json({ error: 'Training session not found' });
      return;
    }

    if (session.created_by === userId) {
      res.status(400).json({ error: 'Creator cannot leave. Use cancel instead.' });
      return;
    }

    const participant = db.prepare(
      'SELECT id, has_paid FROM practice_participants WHERE session_id = ? AND user_id = ?'
    ).get(id, userId) as { id: string; has_paid: number } | undefined;

    if (!participant) {
      res.status(400).json({ error: 'You are not a participant in this session' });
      return;
    }

    // Refund if paid
    if (participant.has_paid) {
      const fee = session.fee_per_player;
      const wallet = db.prepare('SELECT id, escrow FROM wallets WHERE user_id = ?').get(userId) as { id: string; escrow: number };

      if (wallet.escrow >= fee) {
        db.prepare('UPDATE wallets SET balance = balance + ?, escrow = escrow - ? WHERE id = ?').run(fee, fee, wallet.id);
      } else {
        db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(fee, wallet.id);
      }

      db.prepare(
        `INSERT INTO transactions (id, wallet_id, type, amount, description, reference)
         VALUES (?, ?, 'ESCROW_REFUND', ?, ?, ?)`
      ).run(uid('tx'), wallet.id, fee, `Left training session — refund`, id);
    }

    db.prepare('DELETE FROM practice_participants WHERE id = ?').run(participant.id);

    recalcSessionStatus(id);
    db.save();

    res.json({ message: 'Left training session' });
  } catch (err: any) {
    console.error('[Training] POST /:id/leave error:', err.message);
    res.status(500).json({ error: 'Failed to leave training session' });
  }
});

// ── POST /:id/cancel — Cancel session (creator only, protected) ────────────

router.post('/:id/cancel', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const session = db.prepare(
      'SELECT id, created_by, fee_per_player, timetable_ids, status FROM practice_sessions WHERE id = ?'
    ).get(id) as Record<string, any> | undefined;

    if (!session) {
      res.status(404).json({ error: 'Training session not found' });
      return;
    }

    if (session.created_by !== userId) {
      res.status(403).json({ error: 'Only the session creator can cancel it' });
      return;
    }

    if (session.status === 'CANCELLED' || session.status === 'COMPLETED') {
      res.status(400).json({ error: `Session is already ${session.status.toLowerCase()}` });
      return;
    }

    const fee = session.fee_per_player;

    // Refund all paid participants
    const paidParticipants = db.prepare(
      'SELECT user_id FROM practice_participants WHERE session_id = ? AND has_paid = 1'
    ).all(id) as { user_id: string }[];

    for (const p of paidParticipants) {
      const pWallet = db.prepare('SELECT id, balance, escrow FROM wallets WHERE user_id = ?').get(p.user_id) as { id: string; balance: number; escrow: number };
      if (pWallet.escrow >= fee) {
        db.prepare('UPDATE wallets SET balance = balance + ?, escrow = escrow - ? WHERE id = ?').run(fee, fee, pWallet.id);
      } else {
        db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(fee, pWallet.id);
      }
      db.prepare(
        `INSERT INTO transactions (id, wallet_id, type, amount, description, reference)
         VALUES (?, ?, 'ESCROW_REFUND', ?, ?, ?)`
      ).run(uid('tx'), pWallet.id, fee, `Training session cancelled — refund`, id);
    }

    db.prepare('UPDATE practice_sessions SET status = ? WHERE id = ?').run('CANCELLED', id);

    // Free all timetable slots
    const slotIds = parseTimetableIds(session.timetable_ids);
    for (const slotId of slotIds) {
      db.prepare('UPDATE field_timetable SET status = ?, lobby_id = NULL WHERE id = ?')
        .run('AVAILABLE', slotId);
    }

    db.save();

    res.json({ message: 'Training session cancelled, all participants refunded', refundedCount: paidParticipants.length });
  } catch (err: any) {
    console.error('[Training] POST /:id/cancel error:', err.message);
    res.status(500).json({ error: 'Failed to cancel training session' });
  }
});

// ── POST /:id/confirm — Host confirms session (protected) ──────────────────

router.post('/:id/confirm', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const session = db.prepare(
      'SELECT id, created_by, timetable_ids, status FROM practice_sessions WHERE id = ?'
    ).get(id) as Record<string, any> | undefined;

    if (!session) {
      res.status(404).json({ error: 'Training session not found' });
      return;
    }

    if (session.created_by !== userId) {
      res.status(403).json({ error: 'Only the session creator can confirm it' });
      return;
    }

    if (session.status === 'CONFIRMED' || session.status === 'COMPLETED' || session.status === 'CANCELLED') {
      res.status(400).json({ error: `Session is already ${session.status.toLowerCase()}` });
      return;
    }

    // Remove unpaid participants
    const removed = db.prepare(
      'DELETE FROM practice_participants WHERE session_id = ? AND has_paid = 0'
    ).run(id);

    // Update all timetable slots to BOOKED
    const slotIds = parseTimetableIds(session.timetable_ids);
    for (const slotId of slotIds) {
      db.prepare('UPDATE field_timetable SET status = ? WHERE id = ?').run('BOOKED', slotId);
    }

    db.prepare('UPDATE practice_sessions SET status = ? WHERE id = ?').run('CONFIRMED', id);
    db.save();

    const updated = getSessionWithCounts(id);

    res.json({
      message: 'Session confirmed',
      removedUnpaid: removed.changes,
      session: formatSession(updated!),
    });
  } catch (err: any) {
    console.error('[Training] POST /:id/confirm error:', err.message);
    res.status(500).json({ error: 'Failed to confirm training session' });
  }
});

// ── POST /:id/complete — Complete session with 80/20 split (creator only) ──

router.post('/:id/complete', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const session = db.prepare(
      'SELECT id, created_by, fee_per_player, field_id, timetable_ids, status FROM practice_sessions WHERE id = ?'
    ).get(id) as Record<string, any> | undefined;

    if (!session) {
      res.status(404).json({ error: 'Training session not found' });
      return;
    }

    if (session.created_by !== userId) {
      res.status(403).json({ error: 'Only the session creator can complete it' });
      return;
    }

    if (session.status !== 'CONFIRMED') {
      res.status(400).json({ error: 'Only confirmed sessions can be completed' });
      return;
    }

    const fee = session.fee_per_player;

    // Get all paid participants
    const paidParticipants = db.prepare(
      'SELECT user_id FROM practice_participants WHERE session_id = ? AND has_paid = 1'
    ).all(id) as { user_id: string }[];

    const totalCollected = fee * paidParticipants.length;
    const fieldOwnerPayout = totalCollected * 0.80;
    const platformFee = totalCollected * 0.20;

    // Release escrow for all paid participants
    for (const p of paidParticipants) {
      const pWallet = db.prepare('SELECT id, escrow FROM wallets WHERE user_id = ?').get(p.user_id) as { id: string; escrow: number };
      if (pWallet.escrow >= fee) {
        db.prepare('UPDATE wallets SET escrow = escrow - ? WHERE id = ?').run(fee, pWallet.id);
      }
      db.prepare(
        `INSERT INTO transactions (id, wallet_id, type, amount, description, reference)
         VALUES (?, ?, 'ESCROW_RELEASE', ?, ?, ?)`
      ).run(uid('tx'), pWallet.id, fee, `Training session completed — ${id}`, id);
    }

    // Create a pseudo-match record for the platform revenue tracking
    const matchId = uid('tmatch');
    db.prepare(
      `INSERT INTO matches (id, lobby_id, field_id, date, status, total_fees_collected, field_owner_payout, platform_fee, payout_status)
       VALUES (?, ?, ?, date('now'), 'COMPLETED', ?, ?, ?, 'PENDING')`
    ).run(matchId, id, session.field_id || 'off-platform', totalCollected, fieldOwnerPayout, platformFee);

    // Create platform_revenue record
    db.prepare(
      `INSERT INTO platform_revenue (id, match_id, amount, status)
       VALUES (?, ?, ?, 'PENDING')`
    ).run(uid('rev'), matchId, platformFee);

    // Set session COMPLETED
    db.prepare('UPDATE practice_sessions SET status = ? WHERE id = ?').run('COMPLETED', id);

    db.save();

    res.json({
      message: 'Training session completed',
      financials: {
        totalCollected,
        fieldOwnerPayout,
        platformFee,
        paidParticipants: paidParticipants.length,
      },
    });
  } catch (err: any) {
    console.error('[Training] POST /:id/complete error:', err.message);
    res.status(500).json({ error: 'Failed to complete training session' });
  }
});

// ── POST /:id/review — Submit reviews for session participants (protected) ──

router.post('/:id/review', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const { reviews } = req.body;
    const db = getDb();

    if (!Array.isArray(reviews) || reviews.length === 0) {
      res.status(400).json({ error: 'reviews must be a non-empty array' });
      return;
    }

    const session = db.prepare(
      'SELECT id, status FROM practice_sessions WHERE id = ?'
    ).get(id) as Record<string, any> | undefined;

    if (!session) {
      res.status(404).json({ error: 'Training session not found' });
      return;
    }

    if (session.status !== 'COMPLETED') {
      res.status(400).json({ error: 'Can only review completed sessions' });
      return;
    }

    const isParticipant = db.prepare(
      'SELECT id FROM practice_participants WHERE session_id = ? AND user_id = ?'
    ).get(id, userId);

    if (!isParticipant) {
      res.status(403).json({ error: 'Only participants can submit reviews' });
      return;
    }

    let submitted = 0;
    for (const r of reviews) {
      if (!r.userId || !r.rating || r.rating < 1 || r.rating > 5) continue;
      if (r.userId === userId) continue;

      const wasParticipant = db.prepare(
        'SELECT id FROM practice_participants WHERE session_id = ? AND user_id = ?'
      ).get(id, r.userId);
      if (!wasParticipant) continue;

      try {
        db.prepare(
          `INSERT INTO player_reviews (id, session_type, session_id, reviewer_id, reviewee_id, rating, comment)
           VALUES (?, 'training', ?, ?, ?, ?, ?)`
        ).run(uid('rev'), id, userId, r.userId, r.rating, r.comment || null);
        submitted++;
      } catch {
        // UNIQUE constraint — already reviewed, skip
      }
    }

    db.save();

    res.json({ message: `Submitted ${submitted} review(s)`, submitted });
  } catch (err: any) {
    console.error('[Training] POST /:id/review error:', err.message);
    res.status(500).json({ error: 'Failed to submit reviews' });
  }
});

// ── GET /:id/messages — Get training session chat messages (public) ───────

router.get('/:id/messages', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // Verify session exists
    const session = db.prepare('SELECT id FROM practice_sessions WHERE id = ?').get(id);
    if (!session) {
      res.status(404).json({ error: 'Training session not found' });
      return;
    }

    const messages = db.prepare(
      `SELECT id, sender_id, sender_name, content, created_at
       FROM chat_messages
       WHERE context_type = 'training' AND context_id = ?
       ORDER BY created_at ASC`
    ).all(id) as Record<string, any>[];

    res.json({
      messages: messages.map(m => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        content: m.content,
        createdAt: m.created_at,
      })),
    });
  } catch (err: any) {
    console.error('[Training] GET /:id/messages error:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ── POST /:id/messages — Send a training chat message (protected) ────────

router.post('/:id/messages', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const { content } = req.body;
    const db = getDb();

    if (!content || typeof content !== 'string' || !content.trim()) {
      res.status(400).json({ error: 'content is required' });
      return;
    }

    // Verify session exists
    const session = db.prepare('SELECT id FROM practice_sessions WHERE id = ?').get(id);
    if (!session) {
      res.status(404).json({ error: 'Training session not found' });
      return;
    }

    // Get sender name
    const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId) as { full_name: string } | undefined;
    const senderName = user?.full_name || 'Unknown';

    const msgId = uid('msg');
    db.prepare(
      `INSERT INTO chat_messages (id, context_type, context_id, sender_id, sender_name, content)
       VALUES (?, 'training', ?, ?, ?, ?)`
    ).run(msgId, id, userId, senderName, content.trim());

    db.save();

    res.status(201).json({
      message: {
        id: msgId,
        senderId: userId,
        senderName,
        content: content.trim(),
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[Training] POST /:id/messages error:', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
