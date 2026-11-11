import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readFileSync(path.join(root, name), 'utf8');
const checks = [
  'apps/customer/js/components.js',
  'apps/customer/js/pages-public.js',
  'apps/customer/js/experiences.js',
  'apps/customer/js/account.js',
  'apps/customer/app.js',
  'packages/shared/format.js',
  'seo.mjs',
  'scripts/build-gh-pages.mjs',
  'server/customer-server.mjs',
  'server/ops-server.mjs',
];
for (const name of checks) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, name)], { encoding: 'utf8' });
  assert.equal(result.status, 0, name + ': ' + result.stderr);
}
const components = read('apps/customer/js/components.js');
assert.ok(components.includes('J Beauty'), 'Brand wordmark is missing');
assert.ok(components.includes("['occasions', 'المناسبات', 'Occasions']"), 'Occasions navigation missing');
assert.ok(components.includes("['reviews', 'التقييمات', 'Reviews']"), 'Reviews navigation missing');
assert.ok(!components.includes("'admin'"), 'Customer components must not expose admin navigation links');
assert.ok(!existsSync(path.join(root, 'apps/customer/js/admin.js')), 'Customer app must not ship admin.js');
assert.ok(!existsSync(path.join(root, 'pages/js/admin.js')), 'GitHub Pages showcase must not ship admin.js');
const customerApp = read('apps/customer/app.js');
assert.ok(!customerApp.includes('adminPage') && !customerApp.includes('bindAdmin'), 'Customer router must not import staff UI');
const home = read('apps/customer/js/pages-public.js');
assert.ok(home.includes('jb-quick-paths'), 'Homepage discovery links missing');
assert.ok(home.includes('jb-path-occasion'), 'Occasions homepage path missing');
assert.ok(home.includes('jb-path-reviews'), 'Reviews homepage path missing');
assert.ok(home.includes('اقرئي التقييمات أو قيّمي تجربتكِ'), 'Reviews CTA missing');
const experiences = read('apps/customer/js/experiences.js');
assert.ok(experiences.includes('progress five') && experiences.includes('occasion-tabs'), '5-step Occasions wizard missing');
const account = read('apps/customer/js/account.js');
assert.ok(account.includes('jb-rewards-dashboard'), 'New rewards dashboard missing');
assert.ok(account.includes("hasLive ? num(balance) : '—'"), 'Verified-only balance presentation missing');
assert.ok(!account.includes('state.user ? 0 : 250'), 'Guest example balance must not be displayed');
assert.ok(read('pages/js/pages-public.js').includes('jb-quick-paths'), 'Static showcase not synchronized');
assert.ok(read('pages/js/components.js').includes('static preview on GitHub Pages'), 'Static preview notice missing');
assert.ok(read('index.html').includes('J Beauty'), 'Static index not rebranded');
assert.ok(!read('index.html').includes('admin.js') && !read('pages/app.js').includes('admin.js'), 'Static export must contain zero staff references');
for (const file of [
  'apps/customer/js/booking.js',
  'apps/customer/js/pages-public.js',
  'apps/customer/js/account.js',
  'apps/customer/js/experiences.js',
  'seo.mjs',
  'server/booking.mjs',
  'server/experiences.mjs',
  'README.md',
]) {
  assert.ok(!/J SPA/i.test(read(file)), `Stale J SPA brand reference in ${file}`);
}
console.log('PASS branding, bundle-separation, navigation and rewards source checks.');
