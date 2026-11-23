import path from 'node:path';
import os from 'node:os';
import { existsSync, cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHelpers, openDatabase } from '../server/db.mjs';
import { createCustomerApp } from '../server/customer-server.mjs';
import { createOpsApp } from '../server/ops-server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAILWAY_URL = (process.env.RAILWAY_URL || 'https://jbeauty-production.up.railway.app').replace(/\/+$/, '');

async function tryProxyToRailway(req, res, targetPath) {
  const targetUrl = `${RAILWAY_URL}${targetPath}`;
  const fwdHeaders = { ...req.headers };
  delete fwdHeaders['host'];
  delete fwdHeaders['content-length'];
  fwdHeaders['x-forwarded-host'] = req.headers['host'] || 'j-spa.vercel.app';
  fwdHeaders['x-forwarded-proto'] = 'https';

  const method = req.method || 'GET';
  const fetchOpts = {
    method,
    headers: fwdHeaders,
    redirect: 'manual',
    signal: AbortSignal.timeout(8000),
  };

  if (!['GET', 'HEAD'].includes(method.toUpperCase())) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    if (chunks.length) {
      fetchOpts.body = Buffer.concat(chunks);
    }
  }

  const upstream = await fetch(targetUrl, fetchOpts);
  for (const [key, val] of upstream.headers.entries()) {
    if (key.toLowerCase() === 'transfer-encoding') continue;
    res.setHeader(key, val);
  }
  const rawSetCookie = upstream.headers.getSetCookie?.() || upstream.headers.get('set-cookie');
  if (rawSetCookie) {
    res.setHeader('set-cookie', rawSetCookie);
  }

  res.statusCode = upstream.status;
  const arrayBuffer = await upstream.arrayBuffer();
  res.end(Buffer.from(arrayBuffer));
  return true;
}

let cachedPlatform = null;

function getPlatform() {
  if (cachedPlatform) return cachedPlatform;

  let dbPath = process.env.DB_PATH;
  if (!dbPath) {
    if (process.env.VERCEL) {
      dbPath = path.join(os.tmpdir(), 'jspa.sqlite');
      const seedDb = path.join(ROOT, 'data', 'jspa.sqlite');
      if (existsSync(seedDb)) {
        let needSync = !existsSync(dbPath);
        if (!needSync) {
          try {
            const probeDb = openDatabase(dbPath);
            const hasOwner = probeDb.get("SELECT id FROM users WHERE role='owner'");
            const svcCount = probeDb.get("SELECT COUNT(*) as count FROM services")?.count || 0;
            probeDb.close();
            if (!hasOwner || svcCount !== 17) needSync = true;
          } catch {
            needSync = true;
          }
        }
        if (needSync) {
          try {
            cpSync(seedDb, dbPath, { force: true });
          } catch {
            // Fallback to fresh db in tmp
          }
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

    // Reconstruct clean API route from Vercel rewrite or catch-all path parameter
    const parsed = new URL(req.url || '/', 'http://localhost');
    const pathParam = parsed.searchParams.get('path') || (req.query && req.query.path);
    if (pathParam) {
      const sub = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;
      parsed.pathname = `/api/${sub.replace(/^\/+/, '')}`;
      parsed.searchParams.delete('path');
      req.url = parsed.pathname + (parsed.search ? parsed.search : '');
    } else if (req.headers['x-matched-path'] && req.headers['x-matched-path'].startsWith('/api')) {
      const matched = req.headers['x-matched-path'];
      if (!matched.includes('[')) {
        req.url = matched;
      }
    }

    const url = req.url || '/';

    // On Vercel, forward API calls to the persistent Railway server first
    if (process.env.VERCEL) {
      try {
        const proxied = await tryProxyToRailway(req, res, url);
        if (proxied) return;
      } catch (proxyErr) {
        console.warn('Railway proxy attempt failed, falling back to local handler:', proxyErr?.message);
      }
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
