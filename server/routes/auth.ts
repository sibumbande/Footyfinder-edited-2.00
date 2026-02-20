import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import { generateToken, hashPassword, comparePassword } from '../middleware/auth.js';

const router = Router();

// ── POST /register ──────────────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, username, phone, city, position, fitnessLevel } = req.body;

    // Validate required fields
    if (!email || !password || !fullName || !username) {
      res.status(400).json({ error: 'email, password, fullName, and username are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const db = getDb();

    // Check if email is taken
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingEmail) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Check if username is taken
    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUsername) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    // Hash password and generate IDs
    const passwordHash = await hashPassword(password);
    const userId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const walletId = `w-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Insert user
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, username, phone, city, position, fitness_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, email, passwordHash, fullName, username, phone || null, city || null, position || null, fitnessLevel || null);

    // Create wallet
    db.prepare(
      'INSERT INTO wallets (id, user_id, balance, escrow) VALUES (?, ?, 0, 0)'
    ).run(walletId, userId);

    // Persist to disk
    db.save();

    const token = generateToken(userId);

    res.status(201).json({
      token,
      user: { id: userId, email, username, fullName, position: position || null, fitnessLevel: fitnessLevel || null, city: city || null },
    });
  } catch (err: any) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── POST /login ─────────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }

    const db = getDb();

    const user = db.prepare(
      'SELECT id, email, password_hash, full_name, username, position, fitness_level, city FROM users WHERE email = ?'
    ).get(email) as { id: string; email: string; password_hash: string; full_name: string; username: string; position: string | null; fitness_level: string | null; city: string | null } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        position: user.position,
        fitnessLevel: user.fitness_level,
        city: user.city,
      },
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
