// Uso: npm run make-admin -- correo@ejemplo.com
// El usuario debe existir antes en Supabase > Authentication > Users.
import pg from 'pg';

const email = process.argv[2];
if (!email) { console.error('Uso: npm run make-admin -- correo@ejemplo.com'); process.exit(1); }
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const { rows } = await client.query('select id from auth.users where lower(email) = lower($1)', [email]);
  if (!rows.length) { console.error(`No existe un usuario con el correo ${email}`); process.exit(1); }
  await client.query('insert into public.ga_admins (user_id) values ($1) on conflict do nothing', [rows[0].id]);
  console.log(`✔ ${email} ahora es administrador`);
} finally {
  await client.end();
}
