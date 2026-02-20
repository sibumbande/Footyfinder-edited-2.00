import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/database.js';

// ── Config ──────────────────────────────────────────────────────────────────

export const JWT_SECRET = process.env.JWT_SECRET || 'footyfinder-dev-secret-change-in-production';

// ── Types ───────────────────────────────────────────────────────────────────

export interface AuthRequest extends Request {
  userId: string;
  user: { id: string; email: string; username: string };
}

interface TokenPayload {
  userId: string;
}

// ── Middleware ───────────────────────────────────────────────────────────────

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

    const user = getDb()
      .prepare('SELECT id, email, username FROM users WHERE id = ?')
      .get(payload.userId) as { id: string; email: string; username: string } | undefined;

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    (req as AuthRequest).userId = user.id;
    (req as AuthRequest).user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function generateToken(userId: string): string {
  return jwt.sign({ userId } as TokenPayload, JWT_SECRET, { expiresIn: '7d' });
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
