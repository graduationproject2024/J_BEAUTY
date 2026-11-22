import path from 'node:path';
import os from 'node:os';
import { existsSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHelpers, openDatabase } from './server/db.mjs';
import { createCustomerApp } from './server/customer-server.mjs';
import { createOpsApp } from './server/ops-server.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

export function resolveDefaultDbPath() {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  if (process.env.VERCEL) {
    const tmpPath = path.join(os.tmpdir(), 'jspa.sqlite');
    const seedDb = path.join(ROOT, 'data', 'jspa.sqlite');
    if (!existsSync(tmpPath) && existsSync(seedDb)) {
      try {
        cpSync(seedDb, tmpPath);
      } catch {}
    }
    return tmpPath;
  }
  return path.join(ROOT, 'data', 'jspa.sqlite');
}

export function createPlatform({
  dbPath = resolveDefaultDbPath(),
  customerOrigin = process.env.CUSTOMER_ORIGIN || process.env.PUBLIC_ORIGIN || null,
} = {}) {
  const db = openDatabase(dbPath);
  const helpers = createHelpers(db);
  let customerAddr = null;
  const resolveCustomerOrigin =
    customerOrigin ||
    (() => {
      const addr = customerAddr || (customer?.server?.address && customer.server.address());
      const port = addr && typeof addr === 'object' ? addr.port : Number(process.env.PORT || 3000);
      return `http://${process.env.HOST || '127.0.0.1'}:${port}`;
    });
  const port = Number(process.env.PORT || 3000);
  const opsPort = Number(process.env.OPS_PORT || 3100);
  const isUnifiedSinglePort = port === opsPort || !process.env.OPS_PORT;
  const ops = createOpsApp({ dbPath, db, helpers, customerOrigin: resolveCustomerOrigin });
  const customer = createCustomerApp({ dbPath, db, helpers, opsApp: isUnifiedSinglePort ? ops : null });

  return {
    db: db.raw,
    customer,
    ops,
    customerServer: customer.server,
    opsServer: ops.server,
    ownerBootstrap: ops.ownerBootstrap,
    async close() {
      customer.server.closeAllConnections?.();
      ops.server.closeAllConnections?.();
      await Promise.all([
        new Promise((resolve) => customer.server.close(resolve)),
        new Promise((resolve) => ops.server.close(resolve)),
      ]);
      db.close();
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const platform = createPlatform();
  if (process.argv.includes('--create-owner')) {
    try {
      console.log(
        platform.ownerBootstrap({
          name: process.env.OWNER_NAME,
          phone: process.env.OWNER_PHONE,
          password: process.env.OWNER_PASSWORD,
        }),
      );
    } finally {
      platform.db.close();
    }
  } else {
    const host = process.env.HOST || '0.0.0.0';
    const customerPort = Number(process.env.PORT || 3000);
    const opsPort = Number(process.env.OPS_PORT || 3100);
    platform.customerServer.listen(customerPort, host, () => {
      console.log(`J Beauty Customer Portal running at http://${host}:${customerPort}`);
    });
    platform.opsServer.listen(opsPort, host, () => {
      console.log(`J Beauty Operations Portal running at http://${host}:${opsPort}`);
    });
  }
}

// Serverless handler export for Vercel / Cloud Functions compatibility
let vercelPlatform = null;
export default async function handler(req, res) {
  try {
    if (!vercelPlatform) {
      vercelPlatform = createPlatform({ dbPath: resolveDefaultDbPath() });
    }
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
    if (url.startsWith('/api/ops')) {
      return await vercelPlatform.ops.handler(req, res);
    }
    return await vercelPlatform.customer.handler(req, res);
  } catch (error) {
    console.error('Serverless API error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error?.message || 'Internal Server Error' }));
  }
}
