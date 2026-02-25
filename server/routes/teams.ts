import { Router, Response } from 'express';
import { getDb } from '../db/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Helper: check if user already belongs to a team ─────────────────────────

function getUserTeamMembership(userId: string) {
  const db = getDb();
  return db.prepare(
    `SELECT tm.team_id, tm.role, t.name AS team_name
     FROM team_members tm
     JOIN teams t ON t.id = tm.team_id
     WHERE tm.user_id = ?`
  ).get(userId) as { team_id: string; role: string; team_name: string } | undefined;
}

// ── POST / — Create a team ──────────────────────────────────────────────────

router.post('/', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { name, primaryColor, secondaryColor } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Team name is required' });
      return;
    }

    // Check user doesn't already belong to a team
    const existing = getUserTeamMembership(userId);
    if (existing) {
      res.status(400).json({ error: `You already belong to team "${existing.team_name}"` });
      return;
    }

    const db = getDb();

    // Check name uniqueness
    const nameTaken = db.prepare('SELECT id FROM teams WHERE name = ?').get(name.trim());
    if (nameTaken) {
      res.status(409).json({ error: 'Team name already taken' });
      return;
    }

    const teamId = `team-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const memberId = `tm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const walletId = `tw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    db.prepare(
      `INSERT INTO teams (id, name, captain_id, primary_color, secondary_color)
       VALUES (?, ?, ?, ?, ?)`
    ).run(teamId, name.trim(), userId, primaryColor || null, secondaryColor || null);

    db.prepare(
      `INSERT INTO team_members (id, team_id, user_id, role)
       VALUES (?, ?, ?, 'CAPTAIN')`
    ).run(memberId, teamId, userId);

    db.prepare(
      `INSERT INTO team_wallets (id, team_id, balance)
       VALUES (?, ?, 0)`
    ).run(walletId, teamId);

    db.save();

    res.status(201).json({
      team: {
        id: teamId,
        name: name.trim(),
        captainId: userId,
        primaryColor: primaryColor || null,
        secondaryColor: secondaryColor || null,
        createdAt: new Date().toISOString(),
      },
      wallet: { balance: 0 },
    });
  } catch (err: any) {
    console.error('[Teams] POST / error:', err.message);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// ── GET /my-team — Get current user's team ──────────────────────────────────

router.get('/my-team', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const db = getDb();

    const membership = getUserTeamMembership(userId);
    if (!membership) {
      res.status(404).json({ error: 'You are not in a team' });
      return;
    }

    const team = db.prepare(
      `SELECT id, name, captain_id, primary_color, secondary_color, created_at
       FROM teams WHERE id = ?`
    ).get(membership.team_id) as Record<string, any>;

    const members = db.prepare(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.position, tm.role
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = ?
       ORDER BY tm.role DESC, tm.joined_at`
    ).all(membership.team_id) as Record<string, any>[];

    const wallet = db.prepare(
      'SELECT balance FROM team_wallets WHERE team_id = ?'
    ).get(membership.team_id) as { balance: number } | undefined;

    res.json({
      team: {
        id: team.id,
        name: team.name,
        captainId: team.captain_id,
        primaryColor: team.primary_color,
        secondaryColor: team.secondary_color,
        createdAt: team.created_at,
      },
      members: members.map(m => ({
        id: m.id,
        username: m.username,
        fullName: m.full_name,
        avatarUrl: m.avatar_url,
        position: m.position,
        role: m.role,
      })),
      wallet: { balance: wallet?.balance ?? 0 },
    });
  } catch (err: any) {
    console.error('[Teams] GET /my-team error:', err.message);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// ── POST /:id/join — Join a team ────────────────────────────────────────────

router.post('/:id/join', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    // Check user doesn't already belong to a team
    const existing = getUserTeamMembership(userId);
    if (existing) {
      res.status(400).json({ error: `You already belong to team "${existing.team_name}"` });
      return;
    }

    // Check team exists
    const team = db.prepare(
      'SELECT id, name, captain_id, primary_color, secondary_color, created_at FROM teams WHERE id = ?'
    ).get(id) as Record<string, any> | undefined;

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const memberId = `tm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    db.prepare(
      `INSERT INTO team_members (id, team_id, user_id, role)
       VALUES (?, ?, ?, 'PLAYER')`
    ).run(memberId, id, userId);

    db.save();

    res.json({
      message: 'Joined team successfully',
      team: {
        id: team.id,
        name: team.name,
        captainId: team.captain_id,
        primaryColor: team.primary_color,
        secondaryColor: team.secondary_color,
        createdAt: team.created_at,
      },
    });
  } catch (err: any) {
    console.error('[Teams] POST /:id/join error:', err.message);
    res.status(500).json({ error: 'Failed to join team' });
  }
});

// ── POST /:id/leave — Leave a team ──────────────────────────────────────────

router.post('/:id/leave', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    // Check user is a member of this team
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, userId) as { role: string } | undefined;

    if (!membership) {
      res.status(400).json({ error: 'You are not a member of this team' });
      return;
    }

    if (membership.role === 'CAPTAIN') {
      res.status(400).json({ error: 'Captains cannot leave. Transfer captaincy first or disband the team.' });
      return;
    }

    db.prepare(
      'DELETE FROM team_members WHERE team_id = ? AND user_id = ?'
    ).run(id, userId);

    db.save();

    res.json({ message: 'Left team successfully' });
  } catch (err: any) {
    console.error('[Teams] POST /:id/leave error:', err.message);
    res.status(500).json({ error: 'Failed to leave team' });
  }
});

// ── PUT /:id — Update team (captain only) ───────────────────────────────────

router.put('/:id', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const { name, primaryColor, secondaryColor } = req.body;
    const db = getDb();

    // Check current user is the captain
    const team = db.prepare('SELECT captain_id FROM teams WHERE id = ?').get(id) as { captain_id: string } | undefined;

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    if (team.captain_id !== userId) {
      res.status(403).json({ error: 'Only the captain can update team details' });
      return;
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      const nameTaken = db.prepare('SELECT id FROM teams WHERE name = ? AND id != ?').get(name.trim(), id);
      if (nameTaken) {
        res.status(409).json({ error: 'Team name already taken' });
        return;
      }
      fields.push('name = ?');
      values.push(name.trim());
    }
    if (primaryColor !== undefined) { fields.push('primary_color = ?'); values.push(primaryColor); }
    if (secondaryColor !== undefined) { fields.push('secondary_color = ?'); values.push(secondaryColor); }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(id);
    db.prepare(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    db.save();

    const updated = db.prepare(
      'SELECT id, name, captain_id, primary_color, secondary_color, created_at FROM teams WHERE id = ?'
    ).get(id) as Record<string, any>;

    res.json({
      team: {
        id: updated.id,
        name: updated.name,
        captainId: updated.captain_id,
        primaryColor: updated.primary_color,
        secondaryColor: updated.secondary_color,
        createdAt: updated.created_at,
      },
    });
  } catch (err: any) {
    console.error('[Teams] PUT /:id error:', err.message);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// ── POST /:id/contribute — Contribute to team wallet ────────────────────────

router.post('/:id/contribute', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const { amount } = req.body;
    const db = getDb();

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number' });
      return;
    }

    // Check user is a member
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, userId) as { role: string } | undefined;

    if (!membership) {
      res.status(400).json({ error: 'You are not a member of this team' });
      return;
    }

    // Check user has enough balance
    const userWallet = db.prepare(
      'SELECT id, balance FROM wallets WHERE user_id = ?'
    ).get(userId) as { id: string; balance: number } | undefined;

    if (!userWallet || userWallet.balance < amount) {
      res.status(400).json({ error: 'Insufficient funds' });
      return;
    }

    // Check team wallet exists
    const teamWallet = db.prepare(
      'SELECT id, balance FROM team_wallets WHERE team_id = ?'
    ).get(id) as { id: string; balance: number } | undefined;

    if (!teamWallet) {
      res.status(404).json({ error: 'Team wallet not found' });
      return;
    }

    // Deduct from user wallet
    db.prepare('UPDATE wallets SET balance = balance - ? WHERE id = ?').run(amount, userWallet.id);

    // Add to team wallet
    db.prepare('UPDATE team_wallets SET balance = balance + ? WHERE id = ?').run(amount, teamWallet.id);

    // Transaction record for user (debit)
    const userTxId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    db.prepare(
      `INSERT INTO transactions (id, wallet_id, type, amount, description)
       VALUES (?, ?, 'TEAM_CONTRIBUTION', ?, ?)`
    ).run(userTxId, userWallet.id, -amount, 'Contribution to team wallet');

    db.save();

    // Read back updated balances
    const updatedUserWallet = db.prepare('SELECT balance FROM wallets WHERE id = ?').get(userWallet.id) as { balance: number };
    const updatedTeamWallet = db.prepare('SELECT balance FROM team_wallets WHERE id = ?').get(teamWallet.id) as { balance: number };

    res.json({
      userWallet: { balance: updatedUserWallet.balance },
      teamWallet: { balance: updatedTeamWallet.balance },
    });
  } catch (err: any) {
    console.error('[Teams] POST /:id/contribute error:', err.message);
    res.status(500).json({ error: 'Failed to contribute to team wallet' });
  }
});

// ── POST /:id/save-layout — Save captain's formation layout ─────────────────

router.post('/:id/save-layout', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const { layout } = req.body;
    const db = getDb();

    const team = db.prepare('SELECT captain_id FROM teams WHERE id = ?').get(id) as { captain_id: string } | undefined;
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }
    if (team.captain_id !== userId) {
      res.status(403).json({ error: 'Only the captain can save the layout' });
      return;
    }
    if (!layout || typeof layout !== 'object') {
      res.status(400).json({ error: 'layout must be a JSON object' });
      return;
    }

    db.prepare('UPDATE teams SET team_layout = ? WHERE id = ?').run(JSON.stringify(layout), id);
    db.save();

    res.json({ message: 'Layout saved' });
  } catch (err: any) {
    console.error('[Teams] POST /:id/save-layout error:', err.message);
    res.status(500).json({ error: 'Failed to save layout' });
  }
});

// ── GET /:id — Team public profile ──────────────────────────────────────────

router.get('/:id', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const team = db.prepare(
      'SELECT id, name, captain_id, primary_color, secondary_color, created_at FROM teams WHERE id = ?'
    ).get(id) as Record<string, any> | undefined;

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const members = db.prepare(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.position, tm.role
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = ?
       ORDER BY tm.role DESC, tm.joined_at`
    ).all(id) as Record<string, any>[];

    // Only include wallet if requester is a member
    const isMember = db.prepare(
      'SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, userId);

    const result: any = {
      team: {
        id: team.id,
        name: team.name,
        captainId: team.captain_id,
        primaryColor: team.primary_color,
        secondaryColor: team.secondary_color,
        createdAt: team.created_at,
      },
      members: members.map(m => ({
        id: m.id,
        username: m.username,
        fullName: m.full_name,
        avatarUrl: m.avatar_url,
        position: m.position,
        role: m.role,
      })),
    };

    if (isMember) {
      const wallet = db.prepare(
        'SELECT balance FROM team_wallets WHERE team_id = ?'
      ).get(id) as { balance: number } | undefined;
      result.wallet = { balance: wallet?.balance ?? 0 };
    }

    res.json(result);
  } catch (err: any) {
    console.error('[Teams] GET /:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

export default router;
