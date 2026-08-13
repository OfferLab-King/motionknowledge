import {connectAsPostgres, type Database} from '@motionknowledge/database';

let serviceDb: Database | null = null;

/**
 * Process-wide service-role database client. A module-level singleton (not
 * per-request) so server actions, route handlers, and pages share one bounded
 * connection pool instead of leaking a new pool per request.
 */
export function getServiceDb(): Database {
  if (!serviceDb) {
    serviceDb = connectAsPostgres().db;
  }
  return serviceDb;
}
