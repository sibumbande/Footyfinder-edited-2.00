import { Router, Response } from 'express';
import { getDb } from '../db/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Helper: check if user already belongs to a team ─────────────────────────

function getUserTeamMembership(userId: string) {
  const db = getDb();
  // When user is in multiple teams, prefer CAPTAIN role for dashboard display
  return db.prepare(
    `SELECT tm.team_id, tm.role, t.name AS team_name
     FROM team_members tm
     JOIN teams t ON t.id = tm.team_id
     WHERE tm.user_id = ?
     ORDER BY CASE WHEN tm.role = 'CAPTAIN' THEN 0 ELSE 1 END, tm.joined_at
     LIMIT 1`
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
      `SELECT id, name, captain_id, primary_color, secondary_color, created_at, team_layout, motto
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
        teamLayout: team.team_layout || null,
        motto: team.motto || null,
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

// ── GET /my-team/transactions — Team wallet contribution history ─────────────

router.get('/my-team/transactions', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const db = getDb();

    const membership = getUserTeamMembership(userId);
    if (!membership) {
      res.status(404).json({ error: 'You are not in a team' });
      return;
    }

    const rows = db.prepare(
      `SELECT t.id, ABS(t.amount) AS amount, t.description, t.created_at, u.full_name
       FROM transactions t
       JOIN wallets w ON w.id = t.wallet_id
       JOIN users u ON u.id = w.user_id
       JOIN team_members tm ON tm.user_id = u.id AND tm.team_id = ?
       WHERE t.type = 'TEAM_CONTRIBUTION'
       ORDER BY t.created_at DESC
       LIMIT 50`
    ).all(membership.team_id) as Record<string, any>[];

    res.json({
      transactions: rows.map(r => ({
        id: r.id,
        amount: r.amount,
        contributorName: r.full_name,
        description: r.description,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    console.error('[Teams] GET /my-team/transactions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch team transactions' });
  }
});

// ── POST /:id/join — Join a team ────────────────────────────────────────────

router.post('/:id/join', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

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
    const { name, primaryColor, secondaryColor, motto } = req.body;
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
    if (motto !== undefined) { fields.push('motto = ?'); values.push(motto); }

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

// ── GET /all — List all teams with city + recruiting status ─────────────────

router.get('/all', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const db = getDb();

    const rows = db.prepare(
      `SELECT t.id, t.name, t.captain_id, t.primary_color, t.is_recruiting,
              u.full_name AS captain_name, u.city,
              (SELECT count(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count,
              (SELECT 1 FROM team_join_requests jr WHERE jr.team_id = t.id AND jr.user_id = ? AND jr.status = 'PENDING' AND jr.type = 'JOIN_REQUEST') AS has_requested
       FROM teams t
       JOIN users u ON u.id = t.captain_id
       ORDER BY t.name`
    ).all(userId) as Record<string, any>[];

    res.json({
      teams: rows.map(r => ({
        id: r.id,
        name: r.name,
        captainId: r.captain_id,
        captainName: r.captain_name,
        city: r.city || null,
        primaryColor: r.primary_color || null,
        memberCount: r.member_count,
        isRecruiting: !!r.is_recruiting,
        hasRequested: !!r.has_requested,
      })),
    });
  } catch (err: any) {
    console.error('[Teams] GET /all error:', err.message);
    res.status(500).json({ error: 'Failed to list teams' });
  }
});

// ── POST /:id/toggle-recruiting — Captain toggles recruiting status ──────────

router.post('/:id/toggle-recruiting', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const team = db.prepare('SELECT captain_id, is_recruiting FROM teams WHERE id = ?').get(id) as { captain_id: string; is_recruiting: number } | undefined;
    if (!team) { res.status(404).json({ error: 'Team not found' }); return; }
    if (team.captain_id !== userId) { res.status(403).json({ error: 'Only the captain can change recruiting status' }); return; }

    const newVal = team.is_recruiting ? 0 : 1;
    db.prepare('UPDATE teams SET is_recruiting = ? WHERE id = ?').run(newVal, id);
    db.save();

    res.json({ isRecruiting: !!newVal });
  } catch (err: any) {
    console.error('[Teams] POST /:id/toggle-recruiting error:', err.message);
    res.status(500).json({ error: 'Failed to toggle recruiting status' });
  }
});

// ── POST /:id/invite — Captain sends a team invite to a friend ───────────────

router.post('/:id/invite', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const { friendId } = req.body;
    const db = getDb();

    if (!friendId) { res.status(400).json({ error: 'friendId is required' }); return; }

    // Must be captain
    const team = db.prepare('SELECT captain_id FROM teams WHERE id = ?').get(id) as { captain_id: string } | undefined;
    if (!team) { res.status(404).json({ error: 'Team not found' }); return; }
    if (team.captain_id !== userId) { res.status(403).json({ error: 'Only the captain can invite players' }); return; }

    // Target user must exist
    const target = db.prepare('SELECT id, full_name FROM users WHERE id = ?').get(friendId) as { id: string; full_name: string } | undefined;
    if (!target) { res.status(404).json({ error: 'User not found' }); return; }

    // Must be friends
    const areFriends = db.prepare(
      `SELECT 1 FROM friendships
       WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
         AND status = 'ACCEPTED'`
    ).get(userId, friendId, friendId, userId);
    if (!areFriends) { res.status(400).json({ error: 'You can only invite friends to your team' }); return; }

    // Target must not already be in a team
    const existingTeam = getUserTeamMembership(friendId);
    if (existingTeam) { res.status(400).json({ error: `${target.full_name} already belongs to team "${existingTeam.team_name}"` }); return; }

    // Check for existing record for this (team, user) pair
    const existingReq = db.prepare(
      'SELECT id, type, status FROM team_join_requests WHERE team_id = ? AND user_id = ?'
    ).get(id, friendId) as { id: string; type: string; status: string } | undefined;

    if (existingReq) {
      if (existingReq.status === 'PENDING' && existingReq.type === 'JOIN_REQUEST') {
        res.status(400).json({ error: `${target.full_name} has already sent a join request — accept their request instead` });
        return;
      }
      if (existingReq.status === 'PENDING' && existingReq.type === 'CAPTAIN_INVITE') {
        res.status(400).json({ error: `Invite already sent to ${target.full_name}` });
        return;
      }
      if (existingReq.status === 'ACCEPTED') {
        res.status(400).json({ error: `${target.full_name} is already a member` });
        return;
      }
      // DECLINED — re-use the record, update to PENDING CAPTAIN_INVITE
      db.prepare(
        "UPDATE team_join_requests SET type = 'CAPTAIN_INVITE', status = 'PENDING', created_at = datetime('now') WHERE id = ?"
      ).run(existingReq.id);
      db.save();
      res.json({ message: `Invite sent to ${target.full_name}` });
      return;
    }

    const reqId = `tjr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    db.prepare(
      `INSERT INTO team_join_requests (id, team_id, user_id, type) VALUES (?, ?, ?, 'CAPTAIN_INVITE')`
    ).run(reqId, id, friendId);
    db.save();

    res.json({ message: `Invite sent to ${target.full_name}` });
  } catch (err: any) {
    console.error('[Teams] POST /:id/invite error:', err.message);
    res.status(500).json({ error: 'Failed to invite player' });
  }
});

// ── POST /:id/request-join — Player requests to join a team ─────────────────

router.post('/:id/request-join', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const db = getDb();

    const team = db.prepare('SELECT id, name FROM teams WHERE id = ?').get(id) as { id: string; name: string } | undefined;
    if (!team) { res.status(404).json({ error: 'Team not found' }); return; }

    // Check for existing record (any type) for this (team, user) pair
    const existingReq = db.prepare('SELECT id, type, status FROM team_join_requests WHERE team_id = ? AND user_id = ?').get(id, userId) as { id: string; type: string; status: string } | undefined;
    if (existingReq) {
      if (existingReq.status === 'PENDING' && existingReq.type === 'JOIN_REQUEST') { res.status(400).json({ error: 'Join request already pending' }); return; }
      if (existingReq.status === 'PENDING' && existingReq.type === 'CAPTAIN_INVITE') { res.status(400).json({ error: 'This team has already sent you an invite — check your team invites' }); return; }
      if (existingReq.status === 'ACCEPTED') { res.status(400).json({ error: 'You are already a member' }); return; }
      // DECLINED — re-use the record as a new JOIN_REQUEST
      db.prepare("UPDATE team_join_requests SET type = 'JOIN_REQUEST', status = 'PENDING', created_at = datetime('now') WHERE id = ?").run(existingReq.id);
      db.save();
      res.json({ message: 'Join request re-sent', requestId: existingReq.id });
      return;
    }

    const reqId = `tjr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    db.prepare(`INSERT INTO team_join_requests (id, team_id, user_id, type) VALUES (?, ?, ?, 'JOIN_REQUEST')`).run(reqId, id, userId);
    db.save();

    res.status(201).json({ message: `Join request sent to ${team.name}`, requestId: reqId });
  } catch (err: any) {
    console.error('[Teams] POST /:id/request-join error:', err.message);
    res.status(500).json({ error: 'Failed to send join request' });
  }
});

// ── GET /join-requests — Captain views pending requests for their team ───────

router.get('/join-requests', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const db = getDb();

    const membership = getUserTeamMembership(userId);
    if (!membership || membership.role !== 'CAPTAIN') {
      res.json({ requests: [] });
      return;
    }

    const rows = db.prepare(
      `SELECT jr.id AS request_id, jr.created_at,
              u.id AS user_id, u.full_name, u.avatar_url, u.position
       FROM team_join_requests jr
       JOIN users u ON u.id = jr.user_id
       WHERE jr.team_id = ? AND jr.status = 'PENDING' AND jr.type = 'JOIN_REQUEST'
       ORDER BY jr.created_at ASC`
    ).all(membership.team_id) as Record<string, any>[];

    res.json({
      requests: rows.map(r => ({
        requestId: r.request_id,
        createdAt: r.created_at,
        user: { id: r.user_id, fullName: r.full_name, avatarUrl: r.avatar_url, position: r.position },
      })),
    });
  } catch (err: any) {
    console.error('[Teams] GET /join-requests error:', err.message);
    res.status(500).json({ error: 'Failed to fetch join requests' });
  }
});

// ── PUT /join-requests/:requestId — Captain accepts or declines ──────────────

router.put('/join-requests/:requestId', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { requestId } = req.params;
    const { accept } = req.body;
    const db = getDb();

    const jr = db.prepare(
      'SELECT id, team_id, user_id, type, status FROM team_join_requests WHERE id = ?'
    ).get(requestId) as { id: string; team_id: string; user_id: string; type: string; status: string } | undefined;

    if (!jr) { res.status(404).json({ error: 'Request not found' }); return; }
    if (jr.type !== 'JOIN_REQUEST') { res.status(400).json({ error: 'This is a captain invite — only the invited player can respond' }); return; }

    // Must be captain of that team
    const team = db.prepare('SELECT captain_id FROM teams WHERE id = ?').get(jr.team_id) as { captain_id: string } | undefined;
    if (!team || team.captain_id !== userId) { res.status(403).json({ error: 'Only the captain can respond to join requests' }); return; }

    if (jr.status !== 'PENDING') { res.status(400).json({ error: `Request already ${jr.status.toLowerCase()}` }); return; }

    const newStatus = accept ? 'ACCEPTED' : 'DECLINED';
    db.prepare('UPDATE team_join_requests SET status = ? WHERE id = ?').run(newStatus, requestId);

    if (accept) {
      const memberId = `tm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      db.prepare(`INSERT OR IGNORE INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, 'PLAYER')`).run(memberId, jr.team_id, jr.user_id);
    }

    db.save();
    res.json({ message: accept ? 'Player added to team' : 'Request declined' });
  } catch (err: any) {
    console.error('[Teams] PUT /join-requests/:requestId error:', err.message);
    res.status(500).json({ error: 'Failed to respond to join request' });
  }
});

// ── GET /my-invites — Player views pending captain invites directed at them ──

router.get('/my-invites', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const db = getDb();

    const rows = db.prepare(
      `SELECT jr.id AS invite_id, jr.created_at,
              t.id AS team_id, t.name AS team_name, t.primary_color,
              u.full_name AS captain_name,
              (SELECT count(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count
       FROM team_join_requests jr
       JOIN teams t ON t.id = jr.team_id
       JOIN users u ON u.id = t.captain_id
       WHERE jr.user_id = ? AND jr.type = 'CAPTAIN_INVITE' AND jr.status = 'PENDING'
       ORDER BY jr.created_at DESC`
    ).all(userId) as Record<string, any>[];

    res.json({
      invites: rows.map(r => ({
        inviteId: r.invite_id,
        createdAt: r.created_at,
        team: {
          id: r.team_id,
          name: r.team_name,
          primaryColor: r.primary_color || null,
          captainName: r.captain_name,
          memberCount: r.member_count,
        },
      })),
    });
  } catch (err: any) {
    console.error('[Teams] GET /my-invites error:', err.message);
    res.status(500).json({ error: 'Failed to fetch team invites' });
  }
});

// ── PUT /invites/:inviteId — Player accepts or declines a captain invite ──────

router.put('/invites/:inviteId', (req, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { inviteId } = req.params;
    const { accept } = req.body;
    const db = getDb();

    const invite = db.prepare(
      'SELECT id, team_id, user_id, type, status FROM team_join_requests WHERE id = ?'
    ).get(inviteId) as { id: string; team_id: string; user_id: string; type: string; status: string } | undefined;

    if (!invite) { res.status(404).json({ error: 'Invite not found' }); return; }
    if (invite.type !== 'CAPTAIN_INVITE') { res.status(400).json({ error: 'This is a join request — only the captain can respond' }); return; }
    if (invite.user_id !== userId) { res.status(403).json({ error: 'This invite is not for you' }); return; }
    if (invite.status !== 'PENDING') { res.status(400).json({ error: `Invite already ${invite.status.toLowerCase()}` }); return; }

    const newStatus = accept ? 'ACCEPTED' : 'DECLINED';
    db.prepare('UPDATE team_join_requests SET status = ? WHERE id = ?').run(newStatus, inviteId);

    if (accept) {
      const memberId = `tm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      db.prepare(`INSERT OR IGNORE INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, 'PLAYER')`).run(memberId, invite.team_id, userId);
    }

    db.save();
    res.json({ message: accept ? 'You have joined the team!' : 'Invite declined' });
  } catch (err: any) {
    console.error('[Teams] PUT /invites/:inviteId error:', err.message);
    res.status(500).json({ error: 'Failed to respond to team invite' });
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
