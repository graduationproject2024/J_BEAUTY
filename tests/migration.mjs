import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHelpers, openDatabase, uid } from '../server/db.mjs';
import { applyMigrations, rollbackV2Migration } from '../server/database/migrations.mjs';
import { hashPassword } from '../server/auth.mjs';
import { createOpsApp } from '../server/ops-server.mjs';
import { createCustomerApp } from '../server/customer-server.mjs';

const tempDir = mkdtempSync(path.join(tmpdir(), 'jb-migration-test-'));
const dbFile = path.join(tempDir, 'legacy.sqlite');

try {
  // 1. Seed a legacy pre-v2 database manually (without v2 columns or refund_requests)
  const { DatabaseSync } = await import('node:sqlite');
  const raw = new DatabaseSync(dbFile);
  raw.exec(`
    CREATE TABLE users(id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, verified INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
    CREATE TABLE sessions(id TEXT PRIMARY KEY, user_id TEXT, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE bookings(id TEXT PRIMARY KEY, reference TEXT UNIQUE NOT NULL, user_id TEXT, data TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE ledger(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, booking_id TEXT, points INTEGER NOT NULL, unique_key TEXT UNIQUE NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE config(id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
    CREATE TABLE services(id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE packages(id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE verification(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, reference_hash TEXT NOT NULL, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE recovery(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE reward_requests(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE reviews(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, booking_id TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
    CREATE TABLE rate_limits(key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);
    CREATE TABLE audit(id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT, action TEXT NOT NULL, target TEXT, detail TEXT, created_at TEXT NOT NULL);
  `);

  const nowIso = new Date().toISOString();
  const futureExp = Date.now() + 3600000;
  const ownerId = uid();
  const empId = uid();
  const custId = uid();
  const bkId = uid();
  const staffSessId = 'staff-sess-hash';
  const empSessId = 'emp-sess-hash';
  const custSessId = 'cust-sess-hash';

  raw.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run(ownerId, 'Legacy Owner', '0501000001', hashPassword('OwnerLegacy!2026'), 'owner', 1, nowIso);
  raw.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run(empId, 'Legacy Employee', '0501000002', hashPassword('EmpLegacy!2026'), 'employee', 1, nowIso);
  raw.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run(custId, 'Legacy Customer', '0501000003', hashPassword('CustLegacy!2026'), 'customer', 1, nowIso);

  raw.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(staffSessId, ownerId, 'csrf-o', futureExp);
  raw.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(empSessId, empId, 'csrf-e', futureExp);
  raw.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(custSessId, custId, 'csrf-c', futureExp);

  raw.prepare('INSERT INTO bookings VALUES(?,?,?,?,?)').run(
    bkId,
    'JB-LEGACY01',
    custId,
    JSON.stringify({ id: bkId, reference: 'JB-LEGACY01', status: 'confirmed', date: '2026-12-20', time: '14:00', duration: 60, total: 250 }),
    nowIso,
  );
  raw.prepare('INSERT INTO ledger VALUES(?,?,?,?,?,?,?)').run(uid(), custId, bkId, 250, `earn:${bkId}`, 'visit', nowIso);
  raw.close();

  // 2. Open with production openDatabase (triggers idempotent v2 migrations)
  const db = openDatabase(dbFile);
  const helpers = createHelpers(db);

  // Verify customer row, booking, ledger points, and customer session preserved
  const migratedCustomer = db.get('SELECT * FROM users WHERE id=?', custId);
  assert.equal(migratedCustomer.role, 'customer');
  assert.equal(migratedCustomer.verified, 1);
  assert.equal(helpers.balance(custId), 250, 'Existing verified Petals balance must stay intact');

  const preservedCustSess = db.get('SELECT * FROM sessions WHERE id=?', custSessId);
  assert.ok(preservedCustSess, 'Pre-migration customer session must remain intact');
  assert.equal(preservedCustSess.app_scope, 'customer');

  // Verify legacy employee downgraded cleanly to restricted legacy_employee & staff sessions wiped
  const migratedEmp = db.get('SELECT * FROM users WHERE id=?', empId);
  assert.equal(migratedEmp.role, 'legacy_employee', 'Legacy employee must downgrade to restricted legacy_employee');
  assert.equal(db.get('SELECT * FROM sessions WHERE id=?', staffSessId), undefined, 'Owner pre-migration session must be invalidated');
  assert.equal(db.get('SELECT * FROM sessions WHERE id=?', empSessId), undefined, 'Employee pre-migration session must be invalidated');

  // Verify index & refund_requests table exist and EXPLAIN QUERY PLAN uses index
  const plan = db.all('EXPLAIN QUERY PLAN SELECT * FROM bookings WHERE assigned_staff_id=?', empId);
  assert.ok(
    plan.some((p) => String(p.detail || '').includes('idx_bookings_assigned_staff')),
    'Bookings query by assigned_staff_id must use idx_bookings_assigned_staff',
  );
  const refundTable = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='refund_requests'");
  assert.ok(refundTable, 'refund_requests table must exist after migration');

  // Re-running applyMigrations must be completely idempotent
  applyMigrations(db.raw);
  assert.equal(helpers.balance(custId), 250);

  // Verify dual apps open cleanly on migrated database
  const custApp = createCustomerApp({ db, helpers });
  const opsApp = createOpsApp({ db, helpers });
  await custApp.close();
  await opsApp.close();

  // Verify clean rollback helper reverts legacy_employee -> employee without data loss
  rollbackV2Migration(db.raw);
  assert.equal(db.get('SELECT role FROM users WHERE id=?', empId).role, 'employee');
  db.close();

  console.log('PASS migration, legacy downgrade, session revocation, index plan, and rollback checks.');
} finally {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {}
}
