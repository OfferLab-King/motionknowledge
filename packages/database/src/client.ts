import {drizzle, type PostgresJsDatabase} from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export type Database = PostgresJsDatabase<typeof schema>;

export interface DatabaseClientOptions {
  url: string;
  user?: string;
  password?: string;
  max?: number;
  onnotice?: (notice: unknown) => void;
}

export function createDatabaseClient(options: DatabaseClientOptions): {
  db: Database;
  close: () => Promise<void>;
} {
  const sql = postgres(options.url, {
    max: options.max ?? 10,
    username: options.user,
    password: options.password,
    onnotice: options.onnotice ?? (() => undefined),
  });
  const db = drizzle(sql, {schema});
  return {db, close: () => sql.end()};
}

export function connectAsPostgres(): {db: Database; close: () => Promise<void>} {
  return createDatabaseClient({
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres',
  });
}
