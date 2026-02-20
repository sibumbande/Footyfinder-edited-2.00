import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getLobbyWithCounts(lobbyId: string) {
  const db = getDb();
  return db.prepare(
    `SELECT l.*,
            f.name AS field_name, f.location AS field_location, f.city AS field_city,
            ft.date, ft.time_slot,
            (SELECT count(*) FROM lobby_participants lp WHERE lp.lobby_id = l.id) AS participant_count,
            (SELECT count(*) FROM lobby_participants lp WHERE lp.lobby_id = l.id AND lp.has_paid = 1) AS paid_count
     FROM lobbies l
     JOIN fields f ON f.id = l.field_id
     LEFT JOIN field_timetable ft ON ft.id = l.timetable_id
     WHERE l.id = ?`
  ).get(lobbyId) as Record<string, any> | undefined;
}

function recalcLobbyStatus(lobbyId: string) {
  const db = getDb();
  const lobby = db.prepare('SELECT max_players, status FROM lobbies WHERE id = ?').get(lobbyId) as any;
  if (!lobby || lobby.status === 'CONFIRMED' || lobby.status === 'CANCELLED' || lobby.status === 'COMPLETED') return;

  const count = db.prepare('SELECT count(*) AS c FROM lobby_participants WHERE lobby_id = ?').get(lobbyId) as { c: number };

  let newStatus: string;
  if (count.c === 0) newStatus = 'OPEN';
  else if (count.c >= lobby.max_players) newStatus = 'FULL';
  else newStatus = 'FILLING';

  db.prepare('UPDATE lobbies SET status = ? WHERE id = ?').run(newStatus, lobbyId);
}

// ── GET / — List active lobbies (public) ────────────────────────────────────

router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { fieldId, city, intensity, date } = req.query;

    let sql = `SELECT l.id, l.field_id, l.intensity, l.max_players, l.fee_per_player,
                      l.status, l.created_by, l.created_at,
                      f.name AS field_name, f.location AS field_location, f.city AS field_city,
                      ft.date, ft.time_slot,
                      (SELECT count(*) FROM lobby_participants lp WHERE lp.lobby_id = l.id) AS participant_count,
                      (SELECT count(*) FROM lobby_participants lp WHERE lp.lobby_id = l.id AND lp.has_paid = 1) AS paid_count
               FROM lobbies l
               JOIN fields f ON f.id = l.field_id
               LEFT JOIN field_timetable ft ON ft.id = l.timetable_id
               WHERE l.status IN ('OPEN', 'FILLING', 'FULL', 'CONFIRMED')`;

    const params: any[] = [];

    if (fieldId && typeof fieldId === 'string') { sql += ' AND l.field_id = ?'; params.push(fieldId); }
    if (city && typeof city === 'string') { sql += ' AND f.city = ?'; params.push(city); }
    if (intensity && typeof intensity === 'string') { sql += ' AND l.intensity = ?'; params.push(intensity); }
    if (date && typeof date === 'string') { sql += ' AND ft.date = ?'; params.push(date); }

    sql += ' ORDER BY ft.date, ft.time_slot';

    const rows = db.prepare(sql).all(...params) as Record<string, any>[];

    res.json({
      lobbies: rows.map(r => ({
        id: r.id,
        field: { id: r.field_id, name: r.field_name, location: r.field_location, city: r.field_city },
        date: r.date,
        timeSlot: r.time_slot,
        intensity: r.intensity,
        maxPlayers: r.max_players,
        feePerPlayer: r.fee_per_player,
        status: r.status,
        participantCount: r.participant_count,
        paidCount: r.paid_count,
        createdBy: r.created_by,
      })),
    });
  } catch (err: any) {
    console.error('[Lobbies] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch lobbies' });
  }
});

// ── GET /:id — Lobby details (public) ───────────────────────────────────────

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const row = getLobbyWithCounts(id);
    if (!row) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    const participants = db.prepare(
      `SELECT u.id AS user_id, u.username, u.full_name, u.avatar_url, u.position,
              lp.has_paid, lp.joined_at
       FROM lobby_participants lp
       JOIN users u ON u.id = lp.user_id
       WHERE lp.lobby_id = ?
       ORDER BY lp.joined_at`
    ).all(id) as Record<string, any>[];

    res.json({
      lobby: {
        id: row.id,
        status: row.status,
        intensity: row.intensity,
        maxPlayers: row.max_players,
        feePerPlayer: row.fee_per_player,
        participantCount: row.participant_count,
        paidCount: row.paid_count,
        createdBy: row.created_by,
        createdAt: row.created_at,
      },
      field: { id: row.field_id, name: row.field_name, location: row.field_location, city: row.field_city },
      timetable: { date: row.date, timeSlot: row.time_slot },
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
    console.error('[Lobbies] GET /:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch lobby' });
  }
});

// ── POST / — Create a lobby (protected) ─────────────────────────────────────

router.post('/', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { fieldId, timetableId: directTimetableId, date, timeSlot, intensity, maxPlayers, feePerPlayer } = req.body;
    const db = getDb();

    if (!fieldId) {
      res.status(400).json({ error: 'fieldId is required' });
      return;
    }

    // Validate field
    const field = db.prepare('SELECT id, name FROM fields WHERE id = ? AND is_active = 1').get(fieldId);
    if (!field) {
      res.status(404).json({ error: 'Field not found' });
      return;
    }

    // Resolve timetable slot: accept timetableId directly, OR look up from fieldId + date + timeSlot
    let resolvedTimetableId = directTimetableId;

    if (!resolvedTimetableId && date && timeSlot) {
      const found = db.prepare(
        'SELECT id, status FROM field_timetable WHERE field_id = ? AND date = ? AND time_slot = ?'
      ).get(fieldId, date, timeSlot) as Record<string, any> | undefined;

      if (found) {
        resolvedTimetableId = found.id;
      } else {
        // Auto-create the timetable slot so lobbies work even without pre-generated slots
        resolvedTimetableId = uid('ft');
        db.prepare(
          `INSERT INTO field_timetable (id, field_id, date, time_slot, status)
           VALUES (?, ?, ?, ?, 'AVAILABLE')`
        ).run(resolvedTimetableId, fieldId, date, timeSlot);
      }
    }

    if (!resolvedTimetableId) {
      res.status(400).json({ error: 'Either timetableId or both date and timeSlot are required' });
      return;
    }

    // Validate timetable slot
    const slot = db.prepare(
      'SELECT id, status, date, time_slot FROM field_timetable WHERE id = ? AND field_id = ?'
    ).get(resolvedTimetableId, fieldId) as Record<string, any> | undefined;

    if (!slot) {
      res.status(404).json({ error: 'Timetable slot not found' });
      return;
    }

    if (slot.status !== 'AVAILABLE') {
      res.status(400).json({ error: `Slot is not available (current status: ${slot.status})` });
      return;
    }

    const lobbyId = uid('lobby');
    const participantId = uid('lp');

    // Create lobby
    db.prepare(
      `INSERT INTO lobbies (id, field_id, timetable_id, created_by, intensity, max_players, fee_per_player, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'FILLING')`
    ).run(
      lobbyId, fieldId, resolvedTimetableId, userId,
      intensity || 'Casual',
      maxPlayers || 10,
      feePerPlayer ?? 50.00
    );

    // Reserve the timetable slot
    db.prepare('UPDATE field_timetable SET status = ?, lobby_id = ? WHERE id = ?')
      .run('RESERVED', lobbyId, resolvedTimetableId);

    // Auto-add creator as first participant
    db.prepare(
      `INSERT INTO lobby_participants (id, lobby_id, user_id, has_paid)
       VALUES (?, ?, ?, 0)`
    ).run(participantId, lobbyId, userId);

    db.save();

    const lobby = getLobbyWithCounts(lobbyId);

    res.status(201).json({
      lobby: {
        id: lobby!.id,
        fieldId: lobby!.field_id,
        date: lobby!.date,
        timeSlot: lobby!.time_slot,
        intensity: lobby!.intensity,
        maxPlayers: lobby!.max_players,
        feePerPlayer: lobby!.fee_per_player,
        status: lobby!.status,
        participantCount: lobby!.participant_count,
        paidCount: lobby!.paid_count,
        createdBy: lobby!.created_by,
      },
    });
  } catch (err: any) {
    console.error('[Lobbies] POST / error:', err.message);
    res.status(500).json({ error: 'Failed to create lobby' });
  }
});

// ── POST /:id/join — Join a lobby (protected) ──────────────────────────────

router.post('/:id/join', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const lobby = db.prepare('SELECT id, status, max_players FROM lobbies WHERE id = ?').get(id) as Record<string, any> | undefined;

    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    if (lobby.status !== 'OPEN' && lobby.status !== 'FILLING') {
      res.status(400).json({ error: `Cannot join lobby with status ${lobby.status}` });
      return;
    }

    // Check not already joined
    const existing = db.prepare(
      'SELECT id FROM lobby_participants WHERE lobby_id = ? AND user_id = ?'
    ).get(id, userId);

    if (existing) {
      res.status(400).json({ error: 'You have already joined this lobby' });
      return;
    }

    // Check not full
    const count = db.prepare('SELECT count(*) AS c FROM lobby_participants WHERE lobby_id = ?').get(id) as { c: number };
    if (count.c >= lobby.max_players) {
      res.status(400).json({ error: 'Lobby is full' });
      return;
    }

    db.prepare(
      `INSERT INTO lobby_participants (id, lobby_id, user_id, has_paid)
       VALUES (?, ?, ?, 0)`
    ).run(uid('lp'), id, userId);

    recalcLobbyStatus(id);
    db.save();

    const updated = getLobbyWithCounts(id);

    res.json({
      message: 'Joined lobby',
      lobby: {
        id: updated!.id,
        status: updated!.status,
        participantCount: updated!.participant_count,
        paidCount: updated!.paid_count,
        maxPlayers: updated!.max_players,
      },
    });
  } catch (err: any) {
    console.error('[Lobbies] POST /:id/join error:', err.message);
    res.status(500).json({ error: 'Failed to join lobby' });
  }
});

// ── POST /:id/pay — Pay lobby fee (protected) ──────────────────────────────

router.post('/:id/pay', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const lobby = db.prepare(
      'SELECT id, fee_per_player, max_players, status, timetable_id FROM lobbies WHERE id = ?'
    ).get(id) as Record<string, any> | undefined;

    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    // Check user is a participant
    const participant = db.prepare(
      'SELECT id, has_paid FROM lobby_participants WHERE lobby_id = ? AND user_id = ?'
    ).get(id, userId) as { id: string; has_paid: number } | undefined;

    if (!participant) {
      res.status(400).json({ error: 'You are not a participant in this lobby' });
      return;
    }

    if (participant.has_paid) {
      res.status(400).json({ error: 'You have already paid' });
      return;
    }

    const fee = lobby.fee_per_player;

    // Check wallet balance
    const wallet = db.prepare(
      'SELECT id, balance, escrow FROM wallets WHERE user_id = ?'
    ).get(userId) as { id: string; balance: number; escrow: number } | undefined;

    if (!wallet || wallet.balance < fee) {
      res.status(400).json({ error: 'Insufficient funds' });
      return;
    }

    // Move funds from balance to escrow
    db.prepare('UPDATE wallets SET balance = balance - ?, escrow = escrow + ? WHERE id = ?')
      .run(fee, fee, wallet.id);

    // Create ESCROW_HOLD transaction
    db.prepare(
      `INSERT INTO transactions (id, wallet_id, type, amount, description, reference)
       VALUES (?, ?, 'ESCROW_HOLD', ?, ?, ?)`
    ).run(uid('tx'), wallet.id, -fee, `Match fee for lobby ${id}`, id);

    // Mark as paid
    db.prepare('UPDATE lobby_participants SET has_paid = 1, payment_reference = ? WHERE id = ?')
      .run(id, participant.id);

    // Check if all participants have paid
    const counts = db.prepare(
      `SELECT count(*) AS total,
              sum(has_paid) AS paid
       FROM lobby_participants WHERE lobby_id = ?`
    ).get(id) as { total: number; paid: number };

    let lobbyStatus = lobby.status;

    if (counts.paid >= lobby.max_players && counts.total >= lobby.max_players) {
      // All slots filled and all paid → CONFIRMED
      db.prepare('UPDATE lobbies SET status = ? WHERE id = ?').run('CONFIRMED', id);
      lobbyStatus = 'CONFIRMED';

      // Update timetable slot to BOOKED
      if (lobby.timetable_id) {
        db.prepare('UPDATE field_timetable SET status = ? WHERE id = ?').run('BOOKED', lobby.timetable_id);
      }

      // Release escrow for all participants
      const allParticipants = db.prepare(
        'SELECT user_id FROM lobby_participants WHERE lobby_id = ?'
      ).all(id) as { user_id: string }[];

      for (const p of allParticipants) {
        const pWallet = db.prepare('SELECT id, escrow FROM wallets WHERE user_id = ?').get(p.user_id) as { id: string; escrow: number };
        db.prepare('UPDATE wallets SET escrow = escrow - ? WHERE id = ?').run(fee, pWallet.id);
        db.prepare(
          `INSERT INTO transactions (id, wallet_id, type, amount, description, reference)
           VALUES (?, ?, 'ESCROW_RELEASE', ?, ?, ?)`
        ).run(uid('tx'), pWallet.id, fee, `Match confirmed — lobby ${id}`, id);
      }
    }

    db.save();

    // Return updated wallet
    const updatedWallet = db.prepare('SELECT balance, escrow FROM wallets WHERE id = ?').get(wallet.id) as { balance: number; escrow: number };

    res.json({
      message: 'Payment successful',
      wallet: { balance: updatedWallet.balance, escrow: updatedWallet.escrow },
      lobbyStatus,
    });
  } catch (err: any) {
    console.error('[Lobbies] POST /:id/pay error:', err.message);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// ── POST /:id/cancel — Cancel lobby (protected, creator only) ──────────────

router.post('/:id/cancel', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const lobby = db.prepare(
      'SELECT id, created_by, fee_per_player, timetable_id, status FROM lobbies WHERE id = ?'
    ).get(id) as Record<string, any> | undefined;

    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    if (lobby.created_by !== userId) {
      res.status(403).json({ error: 'Only the lobby creator can cancel it' });
      return;
    }

    if (lobby.status === 'CANCELLED' || lobby.status === 'COMPLETED') {
      res.status(400).json({ error: `Lobby is already ${lobby.status.toLowerCase()}` });
      return;
    }

    const fee = lobby.fee_per_player;

    // Refund all paid participants
    const paidParticipants = db.prepare(
      'SELECT user_id FROM lobby_participants WHERE lobby_id = ? AND has_paid = 1'
    ).all(id) as { user_id: string }[];

    for (const p of paidParticipants) {
      const pWallet = db.prepare('SELECT id, balance, escrow FROM wallets WHERE user_id = ?').get(p.user_id) as { id: string; balance: number; escrow: number };
      // If escrow still held (not yet released), refund from escrow; otherwise refund as credit
      if (pWallet.escrow >= fee) {
        db.prepare('UPDATE wallets SET balance = balance + ?, escrow = escrow - ? WHERE id = ?').run(fee, fee, pWallet.id);
      } else {
        db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(fee, pWallet.id);
      }
      db.prepare(
        `INSERT INTO transactions (id, wallet_id, type, amount, description, reference)
         VALUES (?, ?, 'ESCROW_REFUND', ?, ?, ?)`
      ).run(uid('tx'), pWallet.id, fee, `Lobby cancelled — refund`, id);
    }

    // Set lobby to CANCELLED
    db.prepare('UPDATE lobbies SET status = ? WHERE id = ?').run('CANCELLED', id);

    // Free the timetable slot
    if (lobby.timetable_id) {
      db.prepare('UPDATE field_timetable SET status = ?, lobby_id = NULL WHERE id = ?')
        .run('AVAILABLE', lobby.timetable_id);
    }

    db.save();

    res.json({ message: 'Lobby cancelled, all participants refunded', refundedCount: paidParticipants.length });
  } catch (err: any) {
    console.error('[Lobbies] POST /:id/cancel error:', err.message);
    res.status(500).json({ error: 'Failed to cancel lobby' });
  }
});

// ── POST /:id/leave — Leave a lobby (protected) ────────────────────────────

router.post('/:id/leave', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const lobby = db.prepare(
      'SELECT id, created_by, fee_per_player, status FROM lobbies WHERE id = ?'
    ).get(id) as Record<string, any> | undefined;

    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    if (lobby.created_by === userId) {
      res.status(400).json({ error: 'Creator cannot leave. Use cancel instead.' });
      return;
    }

    const participant = db.prepare(
      'SELECT id, has_paid FROM lobby_participants WHERE lobby_id = ? AND user_id = ?'
    ).get(id, userId) as { id: string; has_paid: number } | undefined;

    if (!participant) {
      res.status(400).json({ error: 'You are not a participant in this lobby' });
      return;
    }

    // Refund if paid
    if (participant.has_paid) {
      const fee = lobby.fee_per_player;
      const wallet = db.prepare('SELECT id, escrow FROM wallets WHERE user_id = ?').get(userId) as { id: string; escrow: number };

      if (wallet.escrow >= fee) {
        db.prepare('UPDATE wallets SET balance = balance + ?, escrow = escrow - ? WHERE id = ?').run(fee, fee, wallet.id);
      } else {
        db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(fee, wallet.id);
      }

      db.prepare(
        `INSERT INTO transactions (id, wallet_id, type, amount, description, reference)
         VALUES (?, ?, 'ESCROW_REFUND', ?, ?, ?)`
      ).run(uid('tx'), wallet.id, fee, `Left lobby — refund`, id);
    }

    // Remove participant
    db.prepare('DELETE FROM lobby_participants WHERE id = ?').run(participant.id);

    recalcLobbyStatus(id);
    db.save();

    res.json({ message: 'Left lobby' });
  } catch (err: any) {
    console.error('[Lobbies] POST /:id/leave error:', err.message);
    res.status(500).json({ error: 'Failed to leave lobby' });
  }
});

// ── GET /:id/messages — Get lobby chat messages (public) ──────────────────

router.get('/:id/messages', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // Verify lobby exists
    const lobby = db.prepare('SELECT id FROM lobbies WHERE id = ?').get(id);
    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    const messages = db.prepare(
      `SELECT id, sender_id, sender_name, content, created_at
       FROM chat_messages
       WHERE context_type = 'lobby' AND context_id = ?
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
    console.error('[Lobbies] GET /:id/messages error:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ── POST /:id/messages — Send a lobby chat message (protected) ────────────

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

    // Verify lobby exists
    const lobby = db.prepare('SELECT id FROM lobbies WHERE id = ?').get(id);
    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    // Get sender name
    const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId) as { full_name: string } | undefined;
    const senderName = user?.full_name || 'Unknown';

    const msgId = uid('msg');
    db.prepare(
      `INSERT INTO chat_messages (id, context_type, context_id, sender_id, sender_name, content)
       VALUES (?, 'lobby', ?, ?, ?, ?)`
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
    console.error('[Lobbies] POST /:id/messages error:', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
