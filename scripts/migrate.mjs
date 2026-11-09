import { readFile } from 'node:fs/promises';
import pg from 'pg';

const sql = await readFile(new URL(`../supabase/${process.argv[2] ?? 'schema.sql'}`, import.meta.url), 'utf8');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log(`✔ ${process.argv[2] ?? 'schema.sql'} aplicado`);
} finally {
  await client.end();
}
