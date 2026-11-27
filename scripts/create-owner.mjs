#!/usr/bin/env node
import { createPlatform } from '../server.mjs';

const args = process.argv.slice(2);
const name = args[0] || process.env.OWNER_NAME;
const phone = args[1] || process.env.OWNER_PHONE;
const password = args[2] || process.env.OWNER_PASSWORD;

if (!name || !phone || !password) {
  console.error(`
==============================================================================
J BEAUTY — OWNER BOOTSTRAP TOOL
==============================================================================
Usage:
  node scripts/create-owner.mjs "<Name>" "<Phone>" "<Password>"

Example:
  node scripts/create-owner.mjs "سارة محمد" "0501234567" "P@ssword12345!"

Or provide environment variables:
  OWNER_NAME="سارة محمد" OWNER_PHONE="0501234567" OWNER_PASSWORD="..." node scripts/create-owner.mjs
==============================================================================
`);
  process.exit(1);
}

const platform = createPlatform();
try {
  const result = platform.ownerBootstrap({ name, phone, password });
  console.log(`
[SUCCESS] J Beauty Owner Account Created Successfully!
------------------------------------------------------
ID:       ${result.id}
Name:     ${result.name}
Phone:    ${result.phone}
Role:     ${result.role}
Verified: ${result.verified}
------------------------------------------------------
You can now sign in to the Operations Portal at:
http://localhost:3100/ar/login
`);
} catch (err) {
  console.error(`[ERROR] Failed to create owner account:`, err.message);
  process.exit(1);
} finally {
  platform.db.close();
}
