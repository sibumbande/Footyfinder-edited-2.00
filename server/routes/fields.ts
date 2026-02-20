import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ── Helper: generate timetable slots for next N days ────────────────────────

function generateTimetableSlots(fieldId: string, days: number = 7) {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO field_timetable (id, field_id, date, time_slot, status) VALUES (?, ?, ?, ?, 'AVAILABLE')`
  );

  const today = new Date();
  for (let d = 0; d < days; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD

    for (let h = 8; h <= 21; h++) {
      const timeSlot = `${h.toString().padStart(2, '0')}:00`;
      insert.run(randomUUID(), fieldId, dateStr, timeSlot);
    }
  }
}

// ── GET / — List all active fields (public) ─────────────────────────────────

router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { city } = req.query;

    let sql = `SELECT id, name, location, city, image_url, price_per_slot,
                      surface_type, capacity
               FROM fields WHERE is_active = 1`;
    const params: any[] = [];

    if (city && typeof city === 'string') {
      sql += ' AND city = ?';
      params.push(city);
    }

    sql += ' ORDER BY name';

    const fields = db.prepare(sql).all(...params) as Record<string, any>[];

    res.json({
      fields: fields.map(f => ({
        id: f.id,
        name: f.name,
        location: f.location,
        city: f.city,
        imageUrl: f.image_url,
        pricePerSlot: f.price_per_slot,
        surfaceType: f.surface_type,
        capacity: f.capacity,
      })),
    });
  } catch (err: any) {
    console.error('[Fields] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch fields' });
  }
});

// ── GET /:id — Single field + timetable for next 7 days (public) ────────────

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const field = db.prepare(
      `SELECT id, name, location, city, image_url, price_per_slot,
              surface_type, capacity
       FROM fields WHERE id = ?`
    ).get(id) as Record<string, any> | undefined;

    if (!field) {
      res.status(404).json({ error: 'Field not found' });
      return;
    }

    const timetable = db.prepare(
      `SELECT id, date, time_slot, status, lobby_id
       FROM field_timetable
       WHERE field_id = ?
         AND date BETWEEN date('now') AND date('now', '+6 days')
       ORDER BY date, time_slot`
    ).all(id) as Record<string, any>[];

    res.json({
      field: {
        id: field.id,
        name: field.name,
        location: field.location,
        city: field.city,
        imageUrl: field.image_url,
        pricePerSlot: field.price_per_slot,
        surfaceType: field.surface_type,
        capacity: field.capacity,
      },
      timetable: timetable.map(t => ({
        id: t.id,
        date: t.date,
        timeSlot: t.time_slot,
        status: t.status,
        lobbyId: t.lobby_id,
      })),
    });
  } catch (err: any) {
    console.error('[Fields] GET /:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch field' });
  }
});

// ── GET /:id/timetable — Field timetable with optional date filter (public) ─

router.get('/:id/timetable', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    const db = getDb();

    // Verify field exists
    const field = db.prepare('SELECT id FROM fields WHERE id = ?').get(id);
    if (!field) {
      res.status(404).json({ error: 'Field not found' });
      return;
    }

    let sql = `SELECT id, date, time_slot, status, lobby_id
               FROM field_timetable
               WHERE field_id = ?`;
    const params: any[] = [id];

    if (date && typeof date === 'string') {
      sql += ' AND date = ?';
      params.push(date);
    }

    sql += ' ORDER BY date, time_slot';

    const timetable = db.prepare(sql).all(...params) as Record<string, any>[];

    res.json({
      timetable: timetable.map(t => ({
        id: t.id,
        date: t.date,
        timeSlot: t.time_slot,
        status: t.status,
        lobbyId: t.lobby_id,
      })),
    });
  } catch (err: any) {
    console.error('[Fields] GET /:id/timetable error:', err.message);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// ── POST / — Add a new field (protected) ────────────────────────────────────

router.post('/', authenticate, (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const {
      name, location, city, imageUrl, pricePerSlot, surfaceType,
      capacity, ownerName, ownerEmail, ownerBankAccount, ownerBankName,
      ownerPaystackSubaccount,
    } = req.body;

    if (!name || !location || !city || !ownerName || !ownerEmail) {
      res.status(400).json({ error: 'name, location, city, ownerName, and ownerEmail are required' });
      return;
    }

    const db = getDb();
    const id = randomUUID();

    db.prepare(
      `INSERT INTO fields (id, name, location, city, image_url, price_per_slot, surface_type,
                           capacity, owner_name, owner_email, owner_bank_account, owner_bank_name,
                           owner_paystack_subaccount, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).run(
      id, name, location, city,
      imageUrl || null,
      pricePerSlot ?? 50.0,
      surfaceType || null,
      capacity ?? 10,
      ownerName, ownerEmail,
      ownerBankAccount || null,
      ownerBankName || null,
      ownerPaystackSubaccount || null,
    );

    // Auto-generate timetable for next 7 days
    generateTimetableSlots(id, 7);

    const field = db.prepare('SELECT * FROM fields WHERE id = ?').get(id) as Record<string, any>;

    res.status(201).json({
      field: {
        id: field.id,
        name: field.name,
        location: field.location,
        city: field.city,
        imageUrl: field.image_url,
        pricePerSlot: field.price_per_slot,
        surfaceType: field.surface_type,
        capacity: field.capacity,
      },
    });
  } catch (err: any) {
    console.error('[Fields] POST / error:', err.message);
    res.status(500).json({ error: 'Failed to create field' });
  }
});

// ── PUT /:id — Update a field's details (protected) ─────────────────────────

router.put('/:id', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM fields WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Field not found' });
      return;
    }

    const {
      name, location, city, imageUrl, pricePerSlot, surfaceType,
      capacity, ownerName, ownerEmail, ownerBankAccount, ownerBankName,
      ownerPaystackSubaccount,
    } = req.body;

    db.prepare(
      `UPDATE fields SET
         name = COALESCE(?, name),
         location = COALESCE(?, location),
         city = COALESCE(?, city),
         image_url = COALESCE(?, image_url),
         price_per_slot = COALESCE(?, price_per_slot),
         surface_type = COALESCE(?, surface_type),
         capacity = COALESCE(?, capacity),
         owner_name = COALESCE(?, owner_name),
         owner_email = COALESCE(?, owner_email),
         owner_bank_account = COALESCE(?, owner_bank_account),
         owner_bank_name = COALESCE(?, owner_bank_name),
         owner_paystack_subaccount = COALESCE(?, owner_paystack_subaccount)
       WHERE id = ?`
    ).run(
      name ?? null, location ?? null, city ?? null,
      imageUrl ?? null, pricePerSlot ?? null, surfaceType ?? null,
      capacity ?? null, ownerName ?? null, ownerEmail ?? null,
      ownerBankAccount ?? null, ownerBankName ?? null,
      ownerPaystackSubaccount ?? null,
      id,
    );

    const field = db.prepare(
      `SELECT id, name, location, city, image_url, price_per_slot, surface_type, capacity
       FROM fields WHERE id = ?`
    ).get(id) as Record<string, any>;

    res.json({
      field: {
        id: field.id,
        name: field.name,
        location: field.location,
        city: field.city,
        imageUrl: field.image_url,
        pricePerSlot: field.price_per_slot,
        surfaceType: field.surface_type,
        capacity: field.capacity,
      },
    });
  } catch (err: any) {
    console.error('[Fields] PUT /:id error:', err.message);
    res.status(500).json({ error: 'Failed to update field' });
  }
});

// ── DELETE /:id — Soft delete a field (protected) ───────────────────────────

router.delete('/:id', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM fields WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Field not found' });
      return;
    }

    db.prepare('UPDATE fields SET is_active = 0 WHERE id = ?').run(id);

    res.json({ message: 'Field deactivated' });
  } catch (err: any) {
    console.error('[Fields] DELETE /:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete field' });
  }
});

// ── POST /:id/regenerate-timetable — Regenerate next 7 days (protected) ────

router.post('/:id/regenerate-timetable', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM fields WHERE id = ? AND is_active = 1').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Field not found' });
      return;
    }

    // Remove future AVAILABLE slots (don't touch RESERVED/BOOKED)
    db.prepare(
      `DELETE FROM field_timetable
       WHERE field_id = ? AND date >= date('now') AND status = 'AVAILABLE'`
    ).run(id);

    // Regenerate
    generateTimetableSlots(id, 7);

    const timetable = db.prepare(
      `SELECT id, date, time_slot, status, lobby_id
       FROM field_timetable
       WHERE field_id = ? AND date BETWEEN date('now') AND date('now', '+6 days')
       ORDER BY date, time_slot`
    ).all(id) as Record<string, any>[];

    res.json({
      message: 'Timetable regenerated',
      timetable: timetable.map(t => ({
        id: t.id,
        date: t.date,
        timeSlot: t.time_slot,
        status: t.status,
        lobbyId: t.lobby_id,
      })),
    });
  } catch (err: any) {
    console.error('[Fields] POST /:id/regenerate-timetable error:', err.message);
    res.status(500).json({ error: 'Failed to regenerate timetable' });
  }
});

export default router;
