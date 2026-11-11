import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHelpers, openDatabase } from './server/db.mjs';
import { createCustomerApp } from './server/customer-server.mjs';
import { createOpsApp } from './server/ops-server.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

export function createPlatform({
  dbPath = process.env.DB_PATH || path.join(ROOT, 'data', 'jspa.sqlite'),
  customerOrigin = process.env.CUSTOMER_ORIGIN || process.env.PUBLIC_ORIGIN || null,
} = {}) {
  const db = openDatabase(dbPath);
  const helpers = createHelpers(db);
  const customer = createCustomerApp({ dbPath, db, helpers });
  const resolveCustomerOrigin =
    customerOrigin ||
    (() => {
      const addr = customer.server.address();
      const port = addr && typeof addr === 'object' ? addr.port : Number(process.env.PORT || 3000);
      return `http://${process.env.HOST || '127.0.0.1'}:${port}`;
    });
  const ops = createOpsApp({ dbPath, db, helpers, customerOrigin: resolveCustomerOrigin });

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
    const host = process.env.HOST || '127.0.0.1';
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
