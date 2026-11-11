const MIGRATION_V2 = '20261111_separation_rbac_mfa';

function tableColumns(db, table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((col) => col.name));
}

/**
 * Applies additive, backward-compatible migrations for application separation,
 * host-scoped sessions, least-privilege RBAC, indexed practitioner assignment,
 * and encrypted staff TOTP MFA without mutating customer, booking, loyalty, or review rows.
 */
export function applyMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations(
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = db.prepare('SELECT version FROM schema_migrations WHERE version=?').get(MIGRATION_V2);
  const nowIso = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE');
  try {
    const userCols = tableColumns(db, 'users');
    if (!userCols.has('permissions_json')) db.exec('ALTER TABLE users ADD COLUMN permissions_json TEXT DEFAULT NULL');
    if (!userCols.has('mfa_enabled')) db.exec('ALTER TABLE users ADD COLUMN mfa_enabled INTEGER NOT NULL DEFAULT 0');
    if (!userCols.has('mfa_secret_enc')) db.exec('ALTER TABLE users ADD COLUMN mfa_secret_enc TEXT DEFAULT NULL');
    if (!userCols.has('mfa_recovery_hashes')) db.exec('ALTER TABLE users ADD COLUMN mfa_recovery_hashes TEXT DEFAULT NULL');
    if (!userCols.has('updated_at')) db.exec('ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT NULL');

    const sessCols = tableColumns(db, 'sessions');
    if (!sessCols.has('app_scope')) db.exec("ALTER TABLE sessions ADD COLUMN app_scope TEXT NOT NULL DEFAULT 'customer'");
    if (!sessCols.has('last_seen_at')) db.exec('ALTER TABLE sessions ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0');
    if (!sessCols.has('mfa_verified')) db.exec('ALTER TABLE sessions ADD COLUMN mfa_verified INTEGER NOT NULL DEFAULT 0');

    const bookingCols = tableColumns(db, 'bookings');
    if (!bookingCols.has('assigned_staff_id')) db.exec('ALTER TABLE bookings ADD COLUMN assigned_staff_id TEXT DEFAULT NULL');

    db.exec(`
      CREATE TABLE IF NOT EXISTS refund_requests(
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        decided_by TEXT DEFAULT NULL,
        decided_at TEXT DEFAULT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_bookings_assigned_staff ON bookings(assigned_staff_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_scope ON sessions(app_scope);
      CREATE INDEX IF NOT EXISTS idx_ledger_booking ON ledger(booking_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
      CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
    `);

    if (!applied) {
      // Backfill indexed assigned_staff_id if any booking JSON already stores it
      const rows = db.prepare('SELECT id, data FROM bookings').all();
      const updateBookingCol = db.prepare('UPDATE bookings SET assigned_staff_id=? WHERE id=?');
      for (const row of rows) {
        try {
          const parsed = JSON.parse(row.data);
          if (parsed?.assigned_staff_id) {
            updateBookingCol.run(String(parsed.assigned_staff_id), row.id);
          }
        } catch {}
      }

      // Safely downgrade legacy 'employee' role to restricted 'legacy_employee'
      const downgraded = db
        .prepare("UPDATE users SET role='legacy_employee', updated_at=? WHERE role='employee'")
        .run(nowIso);

      // Revoke any pre-migration non-customer sessions so old staff cookies cannot persist as customer sessions
      const revoked = db
        .prepare("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role != 'customer')")
        .run();

      // Keep customer sessions valid with explicit customer scope and last_seen_at
      db.prepare("UPDATE sessions SET app_scope='customer', last_seen_at=CASE WHEN last_seen_at=0 THEN ? ELSE last_seen_at END WHERE user_id IS NULL OR user_id IN (SELECT id FROM users WHERE role='customer')").run(Date.now());

      db.prepare('INSERT INTO audit(actor,action,target,detail,created_at) VALUES(?,?,?,?,?)').run(
        null,
        'system.migration_v2_rbac',
        MIGRATION_V2,
        JSON.stringify({
          downgraded_employees: Number(downgraded.changes || 0),
          revoked_staff_sessions: Number(revoked.changes || 0),
        }),
        nowIso,
      );

      db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(?,?)').run(MIGRATION_V2, nowIso);
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Reverses role reclassification and session separation on isolated test copies for verified rollback drills
 * while preserving all customer, booking, loyalty, and review data.
 */
export function rollbackV2Migration(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare("UPDATE users SET role='employee', permissions_json=NULL WHERE role='legacy_employee'").run();
    db.prepare("DELETE FROM sessions WHERE app_scope='ops'").run();
    db.prepare('DELETE FROM schema_migrations WHERE version=?').run(MIGRATION_V2);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

