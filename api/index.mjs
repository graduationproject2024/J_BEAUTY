import path from 'node:path';
import os from 'node:os';
import { existsSync, cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHelpers, openDatabase } from '../server/db.mjs';
import { createCustomerApp } from '../server/customer-server.mjs';
import { createOpsApp } from '../server/ops-server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let cachedPlatform = null;

function getPlatform() {
  if (cachedPlatform) return cachedPlatform;

  let dbPath = process.env.DB_PATH;
  if (!dbPath) {
    if (process.env.VERCEL) {
      dbPath = path.join(os.tmpdir(), 'jspa.sqlite');
      const seedDb = path.join(ROOT, 'data', 'jspa.sqlite');
      if (!existsSync(dbPath) && existsSync(seedDb)) {
        try {
          cpSync(seedDb, dbPath);
        } catch {
          // Fallback to fresh db in tmp
        }
      }
    } else {
      dbPath = path.join(ROOT, 'data', 'jspa.sqlite');
    }
  }

  const db = openDatabase(dbPath);
  const helpers = createHelpers(db);
  const customer = createCustomerApp({ dbPath, db, helpers });
  const ops = createOpsApp({ dbPath, db, helpers });

  cachedPlatform = { db, helpers, customer, ops };
  return cachedPlatform;
}

export default async function handler(req, res) {
  try {
    const platform = getPlatform();

    // Normalize URL for Vercel Serverless Function routing
    let url = req.url || '/';
    if (req.query?.path) {
      const sub = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
      url = `/api/${sub}`;
      req.url = url;
    } else if (url.startsWith('/api/[...path]') || url.startsWith('/api/index')) {
      // Check if x-matched-path or x-now-route-matches has real path
      const matched = req.headers['x-matched-path'];
      if (matched && matched.startsWith('/api') && !matched.includes('[')) {
        url = matched;
        req.url = url;
      }
    } else if (!url.startsWith('/api') && url !== '/') {
      url = `/api${url.startsWith('/') ? url : '/' + url}`;
      req.url = url;
    }

    // Route ops API requests to operations app
    if (url.startsWith('/api/ops')) {
      return await platform.ops.handler(req, res);
    }

    // Route customer API requests to customer app
    return await platform.customer.handler(req, res);
  } catch (error) {
    console.error('Vercel API error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error?.message || 'Internal Server Error' }));
  }
}
