-- ============================================================================
-- FootyFinder 2.0 — Seed Data
-- ============================================================================
-- Idempotent: uses INSERT OR IGNORE so safe to re-run on every server start.
-- Timetable slots are generated relative to date('now') for the next 7 days.
-- ============================================================================

-- ── Fields ──────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO fields (id, name, location, city, image_url, price_per_slot, surface_type, capacity, owner_name, owner_email, is_active)
VALUES
  ('field-001', 'Marks Park Sports Club', '9 Orange Rd, Emmarentia', 'Johannesburg',
   'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800', 50.00, 'Grass', 10,
   'Marks Park Management', 'bookings@markspark.co.za', 1),

  ('field-002', 'Hartleyvale Stadium', 'Liesbeek Pkwy, Rondebosch', 'Cape Town',
   'https://images.unsplash.com/photo-1556056333-18bb389e549e?w=800', 50.00, 'Astroturf', 10,
   'Hartleyvale Facilities', 'info@hartleyvale.co.za', 1),

  ('field-003', 'Kings Park Turf', '2 Isaiah Ntshangase Rd, Stamford Hill', 'Durban',
   'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800', 50.00, 'Grass', 10,
   'Kings Park Trust', 'admin@kingspark.co.za', 1),

  ('field-004', 'Wanderers Grassroots', '21 North St, Illovo', 'Johannesburg',
   'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800', 50.00, 'Astroturf', 10,
   'Wanderers Club', 'pitches@wanderers.co.za', 1);

-- ── Timetable (next 7 days × 14 hourly slots × 4 fields) ──────────────────

INSERT OR IGNORE INTO field_timetable (id, field_id, date, time_slot, status)
WITH RECURSIVE
  days(d) AS (
    SELECT date('now')
    UNION ALL
    SELECT date(d, '+1 day') FROM days WHERE d < date('now', '+6 days')
  ),
  hours(h) AS (
    VALUES ('08:00'), ('09:00'), ('10:00'), ('11:00'), ('12:00'),
           ('13:00'), ('14:00'), ('15:00'), ('16:00'), ('17:00'),
           ('18:00'), ('19:00'), ('20:00'), ('21:00')
  ),
  field_ids(fid) AS (
    VALUES ('field-001'), ('field-002'), ('field-003'), ('field-004')
  )
SELECT
  'ft-' || fid || '-' || d || '-' || replace(h, ':', ''),
  fid,
  d,
  h,
  'AVAILABLE'
FROM field_ids, days, hours;
