export const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS offerings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, price REAL, currency TEXT,
  category TEXT, location TEXT, details TEXT, images TEXT, status TEXT DEFAULT 'ACTIVE', tags TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT UNIQUE NOT NULL, whatsapp TEXT, email TEXT,
  source TEXT, status TEXT DEFAULT 'NEW', intent TEXT, budget TEXT, requirement TEXT, offering_id INTEGER,
  notes TEXT, do_not_call INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER NOT NULL, offering_id INTEGER, date TEXT, time TEXT,
  duration INTEGER, status TEXT DEFAULT 'CONFIRMED', google_calendar_event_id TEXT,
  reminder_call_scheduled INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT, direction TEXT NOT NULL, from_number TEXT, to_number TEXT,
  lead_id INTEGER, exotel_call_sid TEXT, stream_sid TEXT, status TEXT DEFAULT 'INITIATED',
  transcript TEXT, summary TEXT, offerings_discussed TEXT, recording_url TEXT, duration_seconds INTEGER,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP, ended_at TEXT);
CREATE TABLE IF NOT EXISTS scheduled_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, lead_id INTEGER NOT NULL, booking_id INTEGER,
  attempt_count INTEGER DEFAULT 0, max_attempts INTEGER DEFAULT 3, next_attempt_at TEXT, last_call_id INTEGER,
  status TEXT DEFAULT 'PENDING', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS do_not_call (phone TEXT PRIMARY KEY, reason TEXT, added_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS google_auth (id INTEGER PRIMARY KEY CHECK (id = 1), tokens TEXT, updated_at TEXT);
`;
