-- Persistent WhatsApp appointments (single salon)
CREATE TABLE IF NOT EXISTS customers (
 wa_id TEXT PRIMARY KEY, name TEXT NOT NULL, pending TEXT NOT NULL DEFAULT '{}',
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS appointments (
 id TEXT PRIMARY KEY, wa_id TEXT NOT NULL REFERENCES customers(wa_id),
 client TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL,
 start_min INTEGER NOT NULL, end_min INTEGER NOT NULL,
 service_id TEXT NOT NULL, staff_id TEXT NOT NULL, duration INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date,status);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(wa_id,status,date);
CREATE TRIGGER IF NOT EXISTS no_overlapping_bookings BEFORE INSERT ON appointments
WHEN NEW.status='confirmed' AND EXISTS (
 SELECT 1 FROM appointments a WHERE a.date=NEW.date AND a.staff_id=NEW.staff_id
 AND a.status='confirmed' AND a.id<>NEW.id
 AND NEW.start_min<a.end_min AND NEW.end_min>a.start_min
)
BEGIN SELECT RAISE(ABORT,'appointment_conflict'); END;
CREATE TRIGGER IF NOT EXISTS no_overlapping_updates
BEFORE UPDATE OF start_min,end_min,date,staff_id,status ON appointments
WHEN NEW.status='confirmed' AND EXISTS (
 SELECT 1 FROM appointments a WHERE a.date=NEW.date AND a.staff_id=NEW.staff_id
 AND a.status='confirmed' AND a.id<>NEW.id
 AND NEW.start_min<a.end_min AND NEW.end_min>a.start_min
)
BEGIN SELECT RAISE(ABORT,'appointment_conflict'); END;
CREATE TABLE IF NOT EXISTS messages (
 id TEXT PRIMARY KEY, wa_id TEXT NOT NULL,
 direction TEXT NOT NULL CHECK(direction IN ('in','out')),
 body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_customer ON messages(wa_id,created_at DESC);
CREATE TABLE IF NOT EXISTS webhook_events (
 message_id TEXT PRIMARY KEY, wa_id TEXT NOT NULL, reply TEXT,
 status TEXT NOT NULL DEFAULT 'processing' CHECK(status IN ('processing','ready','sent','failed')),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);