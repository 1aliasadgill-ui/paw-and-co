import { createClient } from '@libsql/client';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const url = process.env.TURSO_DATABASE_URL;
if (!url) throw new Error('Configure TURSO_DATABASE_URL before applying migrations.');
if (process.env.VERCEL && !/^(libsql|https):\/\//.test(url)) throw new Error('Vercel requires a remote database.');
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
try {
  await client.execute('CREATE TABLE IF NOT EXISTS paw_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)');
  const directory = new URL('../drizzle/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(name, directory), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const tx = await client.transaction('write');
    try {
      const existing = await tx.execute({ sql: 'SELECT checksum FROM paw_migrations WHERE name=?', args: [name] });
      if (existing.rows.length) {
        if (existing.rows[0].checksum !== checksum) throw new Error('An applied migration was modified: ' + name);
      } else {
        for (const query of sql.split('--> statement-breakpoint').map(query => query.trim()).filter(Boolean)) await tx.execute(query);
        await tx.execute({ sql: 'INSERT INTO paw_migrations (name,checksum,applied_at) VALUES (?,?,?)', args: [name, checksum, new Date().toISOString()] });
        console.log('Applied ' + name);
      }
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally { tx.close(); }
  }
} finally { client.close(); }
