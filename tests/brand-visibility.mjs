import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readFileSync(path.join(root, name), 'utf8');
const checks = ['public/js/components.js', 'public/js/pages-public.js', 'public/js/account.js', 'public/app.js', 'seo.mjs', 'scripts/build-gh-pages.mjs'];
for (const name of checks) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, name)], { encoding: 'utf8' });
  assert.equal(result.status, 0, name + ': ' + result.stderr);
}
const components = read('public/js/components.js');
assert.ok(components.includes('J Beauty'), 'Brand wordmark is missing');
assert.ok(components.includes("['occasions', 'المناسبات', 'Occasions']"), 'Occasions navigation missing');
assert.ok(components.includes("['reviews', 'التقييمات', 'Reviews']"), 'Reviews navigation missing');
const home = read('public/js/pages-public.js');
assert.ok(home.includes('jb-quick-paths'), 'Homepage discovery links missing');
assert.ok(home.includes('jb-path-occasion'), 'Occasions homepage path missing');
assert.ok(home.includes('jb-path-reviews'), 'Reviews homepage path missing');
assert.ok(home.includes('اقرئي التقييمات أو قيّمي تجربتكِ'), 'Reviews CTA missing');
const account = read('public/js/account.js');
assert.ok(account.includes('jb-rewards-dashboard'), 'New rewards dashboard missing');
assert.ok(account.includes("hasLive ? num(balance) : '—'"), 'Verified-only balance presentation missing');
assert.ok(!account.includes('state.user ? 0 : 250'), 'Guest example balance must not be displayed');
assert.ok(read('pages/js/pages-public.js').includes('jb-quick-paths'), 'Static showcase not synchronized');
assert.ok(read('pages/js/components.js').includes('static preview on GitHub Pages'), 'Static preview notice missing');
assert.ok(read('index.html').includes('J Beauty'), 'Static index not rebranded');
for (const file of ['public/js/booking.js', 'public/js/pages-public.js', 'public/js/account.js', 'seo.mjs', 'server/booking.mjs', 'server/experiences.mjs', 'README.md']) {
  assert.ok(!/J SPA/i.test(read(file)), `Stale J SPA brand reference in ${file}`);
}
console.log('PASS branding, navigation and rewards source checks; browser and backend suites still required.');
