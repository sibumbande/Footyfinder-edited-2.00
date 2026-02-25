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

// Position labels for each index slot (match FULL_SQUAD_LAYOUT order in frontend)
const HOME_LABELS = ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'];
const AWAY_LABELS = ['ST', 'ST', 'LM', 'CM', 'CM', 'RM', 'LB', 'CB', 'CB', 'RB', 'GK'];

// Maps position_in_formation slot IDs → positionIndex for each side
// HOME side: index 0=GK, 1=LB, 2=CB1, 3=CB2, 4=RB, 5=LM, 6=CM1, 7=CM2, 8=RM, 9=ST1, 10=ST2
const HOME_SLOT_TO_INDEX: Record<string, number> = {
  'gk': 0, 'lb': 1, 'cb1': 2, 'cb2': 3, 'rb': 4,
  'lm': 5, 'cm1': 6, 'cm2': 7, 'rm': 8, 'st1': 9, 'st2': 10,
};
// AWAY side: index 0=ST1, 1=ST2, 2=LM, 3=CM1, 4=CM2, 5=RM, 6=LB, 7=CB1, 8=CB2, 9=RB, 10=GK
const AWAY_SLOT_TO_INDEX: Record<string, number> = {
  'st1': 0, 'st2': 1, 'lm': 2, 'cm1': 3, 'cm2': 4,
  'rm': 5, 'lb': 6, 'cb1': 7, 'cb2': 8, 'rb': 9, 'gk': 10,
};

function getFormationRows(lobbyId: string, db: any) {
  const positions = db.prepare(
    `SELECT lp.team_side, lp.position_on_field, lp.position_index,
            u.id AS user_id, u.username, u.full_name, u.avatar_url
     FROM lobby_positions lp
     JOIN users u ON u.id = lp.user_id
     WHERE lp.lobby_id = ?
     ORDER BY lp.team_side, lp.position_index`
  ).all(lobbyId) as Record<string, any>[];

  const mapPos = (p: Record<string, any>) => ({
    positionIndex: p.position_index,
    positionOnField: p.position_on_field,
    user: { id: p.user_id, username: p.username, fullName: p.full_name, avatarUrl: p.avatar_url },
  });

  return {
    home: positions.filter(p => p.team_side === 'HOME').map(mapPos),
    away: positions.filter(p => p.team_side === 'AWAY').map(mapPos),
  };
}

function fillTeamPositions(
  db: any,
  lobbyId: string,
  teamId: string,
  teamSide: 'HOME' | 'AWAY'
): number {
  const labels = teamSide === 'HOME' ? HOME_LABELS : AWAY_LABELS;
  const slotToIndex = teamSide === 'HOME' ? HOME_SLOT_TO_INDEX : AWAY_SLOT_TO_INDEX;

  const members = db.prepare(
    `SELECT u.id AS user_id, tm.position_in_formation
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = ?
     ORDER BY tm.role DESC, tm.joined_at
     LIMIT 11`
  ).all(teamId) as { user_id: string; position_in_formation: string | null }[];

  // Two-pass assignment:
  // Pass 1 — assign members who have a position_in_formation that maps to a valid index
  const occupiedIndices = new Set<number>();
  const assignedUserIds = new Set<string>();

  members.forEach(member => {
    if (!member.position_in_formation) return;
    const idx = slotToIndex[member.position_in_formation];
    if (idx === undefined || occupiedIndices.has(idx)) return;

    db.prepare(
      `INSERT OR IGNORE INTO lobby_positions (id, lobby_id, user_id, team_side, position_on_field, position_index)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(uid('lpos'), lobbyId, member.user_id, teamSide, labels[idx], idx);

    occupiedIndices.add(idx);
    assignedUserIds.add(member.user_id);
  });

  // Pass 2 — fill remaining members (no position_in_formation or unmapped) sequentially
  let nextIndex = 0;
  members.forEach(member => {
    if (assignedUserIds.has(member.user_id)) return;

    // Find the next free index slot
    while (occupiedIndices.has(nextIndex) && nextIndex < 11) nextIndex++;
    if (nextIndex >= 11) return;

    db.prepare(
      `INSERT OR IGNORE INTO lobby_positions (id, lobby_id, user_id, team_side, position_on_field, position_index)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(uid('lpos'), lobbyId, member.user_id, teamSide, labels[nextIndex], nextIndex);

    occupiedIndices.add(nextIndex);
    assignedUserIds.add(member.user_id);
    nextIndex++;
  });

  // Add all members as lobby_participants with has_paid=1 (team wallet covers fees)
  members.forEach(member => {
    const existingPart = db.prepare(
      'SELECT id FROM lobby_participants WHERE lobby_id = ? AND user_id = ?'
    ).get(lobbyId, member.user_id);

    if (!existingPart) {
      db.prepare(
        `INSERT INTO lobby_participants (id, lobby_id, user_id, has_paid) VALUES (?, ?, ?, 1)`
      ).run(uid('lp'), lobbyId, member.user_id);
    } else {
      db.prepare('UPDATE lobby_participants SET has_paid = 1 WHERE lobby_id = ? AND user_id = ?')
        .run(lobbyId, member.user_id);
    }
  });

  return members.length;
}

// ── GET / — List active lobbies (public) ────────────────────────────────────

router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { fieldId, city, intensity, date } = req.query;

    let sql = `SELECT l.id, l.field_id, l.intensity, l.max_players, l.fee_per_player,
                      l.status, l.created_by, l.created_at, l.team_id,
                      t.name AS team_name,
                      f.name AS field_name, f.location AS field_location, f.city AS field_city,
                      ft.date, ft.time_slot,
                      (SELECT count(*) FROM lobby_participants lp WHERE lp.lobby_id = l.id) AS participant_count,
                      (SELECT count(*) FROM lobby_participants lp WHERE lp.lobby_id = l.id AND lp.has_paid = 1) AS paid_count
               FROM lobbies l
               JOIN fields f ON f.id = l.field_id
               LEFT JOIN field_timetable ft ON ft.id = l.timetable_id
               LEFT JOIN teams t ON t.id = l.team_id
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
        teamId: r.team_id || undefined,
        teamName: r.team_name || undefined,
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
    const { fieldId, timetableId: directTimetableId, date, timeSlot, intensity, maxPlayers, feePerPlayer, teamId } = req.body;
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
      `INSERT INTO lobbies (id, field_id, timetable_id, created_by, team_id, intensity, max_players, fee_per_player, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'FILLING')`
    ).run(
      lobbyId, fieldId, resolvedTimetableId, userId,
      teamId || null,
      intensity || 'Casual',
      maxPlayers || 10,
      feePerPlayer ?? 50.00
    );

    // Reserve the timetable slot
    db.prepare('UPDATE field_timetable SET status = ?, lobby_id = ? WHERE id = ?')
      .run('RESERVED', lobbyId, resolvedTimetableId);

    if (teamId) {
      // Team match: auto-fill HOME positions from team members (they're marked as paid)
      fillTeamPositions(db, lobbyId, teamId, 'HOME');
      recalcLobbyStatus(lobbyId);
    } else {
      // Quick play: add creator as first participant (unpaid until they pay)
      db.prepare(
        `INSERT INTO lobby_participants (id, lobby_id, user_id, has_paid)
         VALUES (?, ?, ?, 0)`
      ).run(participantId, lobbyId, userId);
    }

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

// ── GET /:id/formation — Get pitch positions for a lobby (public) ─────────

router.get('/:id/formation', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const lobbyRow = db.prepare('SELECT id, team_id FROM lobbies WHERE id = ?').get(id) as { id: string; team_id: string | null } | undefined;
    if (!lobbyRow) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    const formation = getFormationRows(id, db);

    // For team lobbies, merge saved team layouts into HOME and AWAY sides
    // This fills name-only squad members (not real DB users) for visual display
    if (lobbyRow.team_id) {
      // ── HOME: merge host team's saved layout ──────────────────────────────
      const teamRow = db.prepare('SELECT team_layout FROM teams WHERE id = ?').get(lobbyRow.team_id) as { team_layout: string | null } | undefined;
      if (teamRow?.team_layout) {
        try {
          const layout = JSON.parse(teamRow.team_layout) as Record<string, string>;
          const occupiedHomeIndices = new Set(formation.home.map(p => p.positionIndex));

          for (const [slotId, playerName] of Object.entries(layout)) {
            if (!playerName) continue;
            const idx = HOME_SLOT_TO_INDEX[slotId];
            if (idx === undefined || occupiedHomeIndices.has(idx)) continue;

            formation.home.push({
              positionIndex: idx,
              positionOnField: HOME_LABELS[idx],
              user: { id: `layout-${slotId}`, username: playerName, fullName: playerName, avatarUrl: null },
            });
            occupiedHomeIndices.add(idx);
          }

          // Keep sorted by positionIndex
          formation.home.sort((a, b) => a.positionIndex - b.positionIndex);
        } catch {
          // Malformed JSON — skip layout merge
        }
      }

      // ── AWAY: merge challenger team's saved layout ────────────────────────
      // Find the challenger team by looking up the first real AWAY user's team membership
      const firstAwayUser = db.prepare(
        "SELECT user_id FROM lobby_positions WHERE lobby_id = ? AND team_side = 'AWAY' LIMIT 1"
      ).get(id) as { user_id: string } | undefined;

      if (firstAwayUser) {
        const challengerTeamRow = db.prepare(
          `SELECT team_id FROM team_members WHERE user_id = ? AND team_id != ? LIMIT 1`
        ).get(firstAwayUser.user_id, lobbyRow.team_id) as { team_id: string } | undefined;

        if (challengerTeamRow) {
          const challengerTeamData = db.prepare('SELECT team_layout FROM teams WHERE id = ?').get(challengerTeamRow.team_id) as { team_layout: string | null } | undefined;
          if (challengerTeamData?.team_layout) {
            try {
              const layout = JSON.parse(challengerTeamData.team_layout) as Record<string, string>;
              const occupiedAwayIndices = new Set(formation.away.map(p => p.positionIndex));

              for (const [slotId, playerName] of Object.entries(layout)) {
                if (!playerName) continue;
                const idx = AWAY_SLOT_TO_INDEX[slotId];
                if (idx === undefined || occupiedAwayIndices.has(idx)) continue;

                formation.away.push({
                  positionIndex: idx,
                  positionOnField: AWAY_LABELS[idx],
                  user: { id: `layout-away-${slotId}`, username: playerName, fullName: playerName, avatarUrl: null },
                });
                occupiedAwayIndices.add(idx);
              }

              formation.away.sort((a, b) => a.positionIndex - b.positionIndex);
            } catch {
              // Malformed JSON — skip layout merge
            }
          }
        }
      }
    }

    res.json(formation);
  } catch (err: any) {
    console.error('[Lobbies] GET /:id/formation error:', err.message);
    res.status(500).json({ error: 'Failed to fetch formation' });
  }
});

// ── POST /:id/pick-position — Claim a pitch position (protected) ───────────

router.post('/:id/pick-position', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const { teamSide, positionOnField, positionIndex } = req.body;
    const db = getDb();

    if (!teamSide || !positionOnField || positionIndex === undefined || positionIndex === null) {
      res.status(400).json({ error: 'teamSide, positionOnField, and positionIndex are required' });
      return;
    }

    if (!['HOME', 'AWAY'].includes(teamSide)) {
      res.status(400).json({ error: 'teamSide must be HOME or AWAY' });
      return;
    }

    const lobby = db.prepare('SELECT id, status FROM lobbies WHERE id = ?').get(id) as Record<string, any> | undefined;
    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    if (lobby.status === 'CANCELLED' || lobby.status === 'COMPLETED') {
      res.status(400).json({ error: 'Lobby is not active' });
      return;
    }

    // Must be a paid participant
    const participant = db.prepare(
      'SELECT id, has_paid FROM lobby_participants WHERE lobby_id = ? AND user_id = ?'
    ).get(id, userId) as { id: string; has_paid: number } | undefined;

    if (!participant || !participant.has_paid) {
      res.status(400).json({ error: 'You must pay the entry fee before picking a position' });
      return;
    }

    // Check position slot not already taken by someone else
    const slotTaken = db.prepare(
      'SELECT user_id FROM lobby_positions WHERE lobby_id = ? AND team_side = ? AND position_index = ?'
    ).get(id, teamSide, positionIndex) as { user_id: string } | undefined;

    if (slotTaken && slotTaken.user_id !== userId) {
      res.status(400).json({ error: 'That position is already taken' });
      return;
    }

    // Upsert: update existing row if user has one, else insert
    const existing = db.prepare(
      'SELECT id FROM lobby_positions WHERE lobby_id = ? AND user_id = ?'
    ).get(id, userId);

    if (existing) {
      db.prepare(
        `UPDATE lobby_positions
         SET team_side = ?, position_on_field = ?, position_index = ?
         WHERE lobby_id = ? AND user_id = ?`
      ).run(teamSide, positionOnField, positionIndex, id, userId);
    } else {
      db.prepare(
        `INSERT INTO lobby_positions (id, lobby_id, user_id, team_side, position_on_field, position_index)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(uid('lpos'), id, userId, teamSide, positionOnField, positionIndex);
    }

    db.save();

    const formation = getFormationRows(id, db);
    res.json({ message: 'Position claimed', home: formation.home, away: formation.away });
  } catch (err: any) {
    console.error('[Lobbies] POST /:id/pick-position error:', err.message);
    res.status(500).json({ error: 'Failed to pick position' });
  }
});

// ── POST /:id/accept-challenge — Challenger team auto-fills AWAY (protected)

router.post('/:id/accept-challenge', authenticate, (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const lobby = db.prepare(
      'SELECT id, team_id, timetable_id, status FROM lobbies WHERE id = ?'
    ).get(id) as Record<string, any> | undefined;

    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    if (!lobby.team_id) {
      res.status(400).json({ error: 'This is not a team match' });
      return;
    }

    if (lobby.status === 'CONFIRMED' || lobby.status === 'CANCELLED') {
      res.status(400).json({ error: `Lobby is already ${lobby.status.toLowerCase()}` });
      return;
    }

    // Caller must be a captain of a DIFFERENT team
    const membership = db.prepare(
      `SELECT tm.team_id, tm.role
       FROM team_members tm
       WHERE tm.user_id = ? AND tm.role = 'CAPTAIN'`
    ).get(userId) as { team_id: string; role: string } | undefined;

    console.log('[Lobbies] accept-challenge debug:', {
      userId,
      lobbyTeamId: lobby.team_id,
      challengerTeamId: membership?.team_id ?? 'NO_MEMBERSHIP',
      sameTeam: membership?.team_id === lobby.team_id,
    });

    if (!membership) {
      res.status(403).json({ error: 'Only a team captain can accept a challenge' });
      return;
    }

    if (membership.team_id === lobby.team_id) {
      res.status(400).json({ error: 'You cannot challenge your own team' });
      return;
    }

    // AWAY side must not already be filled
    const awayCount = db.prepare(
      "SELECT count(*) AS c FROM lobby_positions WHERE lobby_id = ? AND team_side = 'AWAY'"
    ).get(id) as { c: number };

    if (awayCount.c > 0) {
      res.status(400).json({ error: 'A challenger team has already accepted this match' });
      return;
    }

    // Auto-fill AWAY positions from challenger's team
    const filled = fillTeamPositions(db, id, membership.team_id, 'AWAY');
    if (filled === 0) {
      res.status(400).json({ error: 'Your team has no members' });
      return;
    }

    // If HOME side also has players, auto-confirm
    const homeCount = db.prepare(
      "SELECT count(*) AS c FROM lobby_positions WHERE lobby_id = ? AND team_side = 'HOME'"
    ).get(id) as { c: number };

    let newStatus = lobby.status as string;
    if (homeCount.c > 0) {
      db.prepare("UPDATE lobbies SET status = 'CONFIRMED' WHERE id = ?").run(id);
      newStatus = 'CONFIRMED';
      if (lobby.timetable_id) {
        db.prepare("UPDATE field_timetable SET status = 'BOOKED' WHERE id = ?").run(lobby.timetable_id);
      }
    }

    // Get challenger team name
    const challengerTeam = db.prepare('SELECT name FROM teams WHERE id = ?').get(membership.team_id) as { name: string } | undefined;

    db.save();

    const formation = getFormationRows(id, db);
    res.json({
      message: 'Challenge accepted',
      status: newStatus,
      challengerTeamName: challengerTeam?.name || 'Challenger',
      home: formation.home,
      away: formation.away,
    });
  } catch (err: any) {
    console.error('[Lobbies] POST /:id/accept-challenge error:', err.message);
    res.status(500).json({ error: 'Failed to accept challenge' });
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
