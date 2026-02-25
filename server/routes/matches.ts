import { Router, Response } from 'express';
import { getDb } from '../db/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── POST /complete — Complete a match from a confirmed lobby ────────────────

router.post('/complete', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { lobbyId, scoreHome, scoreAway, players } = req.body;
    const db = getDb();

    if (!lobbyId) {
      res.status(400).json({ error: 'lobbyId is required' });
      return;
    }

    const lobby = db.prepare(
      `SELECT l.id, l.field_id, l.fee_per_player, l.status, l.created_by,
              ft.date
       FROM lobbies l
       LEFT JOIN field_timetable ft ON ft.id = l.timetable_id
       WHERE l.id = ?`
    ).get(lobbyId) as Record<string, any> | undefined;

    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' });
      return;
    }

    if (lobby.status !== 'CONFIRMED') {
      res.status(400).json({ error: `Lobby must be CONFIRMED to complete (current: ${lobby.status})` });
      return;
    }

    // Calculate financials
    const paidCount = db.prepare(
      'SELECT count(*) AS c FROM lobby_participants WHERE lobby_id = ? AND has_paid = 1'
    ).get(lobbyId) as { c: number };

    const totalFeesCollected = lobby.fee_per_player * paidCount.c;
    const fieldOwnerPayout = Math.round(totalFeesCollected * 0.80 * 100) / 100;
    const platformFee = Math.round(totalFeesCollected * 0.20 * 100) / 100;

    // Create match record
    const matchId = uid('match');
    const matchDate = lobby.date || new Date().toISOString().split('T')[0];

    db.prepare(
      `INSERT INTO matches (id, lobby_id, field_id, date, score_home, score_away,
                            status, total_fees_collected, field_owner_payout, platform_fee, payout_status)
       VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, 'PENDING')`
    ).run(matchId, lobbyId, lobby.field_id, matchDate,
          scoreHome ?? 0, scoreAway ?? 0,
          totalFeesCollected, fieldOwnerPayout, platformFee);

    // Build a name→userId lookup from lobby_positions + users
    const lobbyPositionUsers = db.prepare(
      `SELECT lp.user_id, u.full_name, lp.team_side
       FROM lobby_positions lp
       JOIN users u ON u.id = lp.user_id
       WHERE lp.lobby_id = ?`
    ).all(lobbyId) as { user_id: string; full_name: string; team_side: string }[];

    const nameToUserId: Record<string, string> = {};
    lobbyPositionUsers.forEach(row => {
      nameToUserId[row.full_name] = row.user_id;
    });

    // Track which user_ids have been inserted to avoid UNIQUE constraint violations
    const insertedUserIds = new Set<string>();

    // Create match_players records
    if (Array.isArray(players) && players.length > 0) {
      for (const p of players) {
        // userId might be a real ID or a player name — resolve to real ID
        let resolvedId = p.userId;
        if (nameToUserId[p.userId]) {
          resolvedId = nameToUserId[p.userId];
        } else {
          // Try direct lookup as user ID
          const userCheck = db.prepare('SELECT id FROM users WHERE id = ?').get(p.userId);
          if (!userCheck) continue; // Skip unknown players
        }
        if (insertedUserIds.has(resolvedId)) continue;
        insertedUserIds.add(resolvedId);

        db.prepare(
          `INSERT INTO match_players (id, match_id, user_id, team_side, goals, assists, rating)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(uid('mp'), matchId, resolvedId, p.teamSide || 'HOME',
              p.goals ?? 0, p.assists ?? 0, p.rating ?? null);
      }
    }

    // Also add any lobby position users not already covered (ensures all players get a record)
    lobbyPositionUsers.forEach(row => {
      if (insertedUserIds.has(row.user_id)) return;
      insertedUserIds.add(row.user_id);
      db.prepare(
        `INSERT INTO match_players (id, match_id, user_id, team_side, goals, assists, rating)
         VALUES (?, ?, ?, ?, 0, 0, NULL)`
      ).run(uid('mp'), matchId, row.user_id, row.team_side);
    });

    // Fallback: if no lobby_positions exist, populate from lobby_participants
    if (insertedUserIds.size === 0) {
      const participants = db.prepare(
        'SELECT user_id FROM lobby_participants WHERE lobby_id = ?'
      ).all(lobbyId) as { user_id: string }[];

      participants.forEach((p, i) => {
        db.prepare(
          `INSERT INTO match_players (id, match_id, user_id, team_side, goals, assists, rating)
           VALUES (?, ?, ?, ?, 0, 0, NULL)`
        ).run(uid('mp'), matchId, p.user_id, i < participants.length / 2 ? 'HOME' : 'AWAY');
      });
    }

    // Create platform_revenue record
    db.prepare(
      `INSERT INTO platform_revenue (id, match_id, amount, status)
       VALUES (?, ?, ?, 'PENDING')`
    ).run(uid('rev'), matchId, platformFee);

    // Update lobby status to COMPLETED
    db.prepare('UPDATE lobbies SET status = ? WHERE id = ?').run('COMPLETED', lobbyId);

    db.save();

    // Fetch the created match for response
    const match = db.prepare(
      `SELECT m.*, f.name AS field_name, f.location AS field_location
       FROM matches m
       JOIN fields f ON f.id = m.field_id
       WHERE m.id = ?`
    ).get(matchId) as Record<string, any>;

    res.status(201).json({
      match: {
        id: match.id,
        lobbyId: match.lobby_id,
        date: match.date,
        field: { id: match.field_id, name: match.field_name, location: match.field_location },
        scoreHome: match.score_home,
        scoreAway: match.score_away,
        status: match.status,
      },
      financials: {
        totalCollected: totalFeesCollected,
        fieldOwnerPayout,
        platformFee,
      },
    });
  } catch (err: any) {
    console.error('[Matches] POST /complete error:', err.message);
    res.status(500).json({ error: 'Failed to complete match' });
  }
});

// ── GET /stats/me — Career stats (must be before /:id) ─────────────────────

router.get('/stats/me', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const db = getDb();

    const stats = db.prepare(
      `SELECT
         count(*) AS total_matches,
         coalesce(sum(mp.goals), 0) AS total_goals,
         coalesce(sum(mp.assists), 0) AS total_assists,
         round(avg(mp.rating), 2) AS average_rating
       FROM match_players mp
       JOIN matches m ON m.id = mp.match_id
       WHERE mp.user_id = ? AND m.status = 'COMPLETED'`
    ).get(userId) as Record<string, any>;

    // Win/loss/draw calculation
    const matchResults = db.prepare(
      `SELECT mp.team_side, m.score_home, m.score_away
       FROM match_players mp
       JOIN matches m ON m.id = mp.match_id
       WHERE mp.user_id = ? AND m.status = 'COMPLETED'`
    ).all(userId) as Record<string, any>[];

    let wins = 0, losses = 0, draws = 0;
    for (const r of matchResults) {
      const myScore = r.team_side === 'HOME' ? r.score_home : r.score_away;
      const oppScore = r.team_side === 'HOME' ? r.score_away : r.score_home;
      if (myScore > oppScore) wins++;
      else if (myScore < oppScore) losses++;
      else draws++;
    }

    res.json({
      totalMatches: stats.total_matches,
      totalGoals: stats.total_goals,
      totalAssists: stats.total_assists,
      averageRating: stats.average_rating,
      wins,
      losses,
      draws,
    });
  } catch (err: any) {
    console.error('[Matches] GET /stats/me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── GET / — List user's matches ─────────────────────────────────────────────

router.get('/', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const db = getDb();

    const rows = db.prepare(
      `SELECT m.id, m.date, m.score_home, m.score_away, m.status,
              f.name AS field_name, f.location AS field_location,
              mp.team_side, mp.goals, mp.assists, mp.rating
       FROM match_players mp
       JOIN matches m ON m.id = mp.match_id
       JOIN fields f ON f.id = m.field_id
       WHERE mp.user_id = ?
       ORDER BY m.date DESC`
    ).all(userId) as Record<string, any>[];

    res.json({
      matches: rows.map(r => ({
        id: r.id,
        date: r.date,
        field: { name: r.field_name, location: r.field_location },
        scoreHome: r.score_home,
        scoreAway: r.score_away,
        status: r.status,
        teamSide: r.team_side,
        goals: r.goals,
        assists: r.assists,
        rating: r.rating,
      })),
    });
  } catch (err: any) {
    console.error('[Matches] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// ── GET /:id — Match details ────────────────────────────────────────────────

router.get('/:id', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const match = db.prepare(
      `SELECT m.*, f.name AS field_name, f.location AS field_location, f.city AS field_city,
              l.created_by AS lobby_creator
       FROM matches m
       JOIN fields f ON f.id = m.field_id
       JOIN lobbies l ON l.id = m.lobby_id
       WHERE m.id = ?`
    ).get(id) as Record<string, any> | undefined;

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const players = db.prepare(
      `SELECT mp.user_id, u.username, u.full_name, u.avatar_url,
              mp.team_side, mp.goals, mp.assists, mp.rating
       FROM match_players mp
       JOIN users u ON u.id = mp.user_id
       WHERE mp.match_id = ?
       ORDER BY mp.team_side, mp.goals DESC`
    ).all(id) as Record<string, any>[];

    const result: any = {
      match: {
        id: match.id,
        lobbyId: match.lobby_id,
        date: match.date,
        scoreHome: match.score_home,
        scoreAway: match.score_away,
        status: match.status,
      },
      field: {
        id: match.field_id,
        name: match.field_name,
        location: match.field_location,
        city: match.field_city,
      },
      players: players.map(p => ({
        userId: p.user_id,
        username: p.username,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        teamSide: p.team_side,
        goals: p.goals,
        assists: p.assists,
        rating: p.rating,
      })),
    };

    // Include financials if user is the lobby creator
    if (match.lobby_creator === userId) {
      result.financials = {
        totalCollected: match.total_fees_collected,
        fieldOwnerPayout: match.field_owner_payout,
        platformFee: match.platform_fee,
        payoutStatus: match.payout_status,
      };
    }

    res.json(result);
  } catch (err: any) {
    console.error('[Matches] GET /:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

export default router;
