import { cpSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CUSTOMER_DIR = path.join(ROOT, 'apps', 'customer');
const STAFF_DIR = path.join(ROOT, 'apps', 'staff');
const SHARED_DIR = path.join(ROOT, 'packages', 'shared');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PUBLIC_OPS_DIR = path.join(PUBLIC_DIR, 'ops');

console.log('Syncing assets to public/...');

// 1. Sync customer app to public/
cpSync(CUSTOMER_DIR, PUBLIC_DIR, { recursive: true });

// 2. Sync shared tokens to public/shared/
mkdirSync(path.join(PUBLIC_DIR, 'shared'), { recursive: true });
cpSync(path.join(SHARED_DIR, 'tokens.css'), path.join(PUBLIC_DIR, 'shared', 'tokens.css'));

// 3. Sync staff app to public/ops/
mkdirSync(PUBLIC_OPS_DIR, { recursive: true });
cpSync(STAFF_DIR, PUBLIC_OPS_DIR, { recursive: true });

// 4. Sync customer index.html to root index.html so root is always canonical
cpSync(path.join(CUSTOMER_DIR, 'index.html'), path.join(ROOT, 'index.html'));

console.log('Successfully synced apps/customer and apps/staff to public/ and root index.html!');
