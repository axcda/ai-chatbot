/**
 * Drizzle DB entrypoint
 * Shared database client for server-side code
 */
import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// biome-ignore lint: we intentionally fail fast if missing
const POSTGRES_URL = process.env.POSTGRES_URL!;

const client = postgres(POSTGRES_URL);
export const db = drizzle(client);

export type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

