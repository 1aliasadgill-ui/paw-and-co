import { createClient, type Client, type InValue } from '@libsql/client';

let client: Client | undefined;
export function getClient(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error('Store database is unavailable. Configure TURSO_DATABASE_URL.');
  if (process.env.VERCEL && !/^(libsql|https):\/\//.test(url)) throw new Error('Vercel requires a persistent remote database.');
  client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return client;
}
function argument(value: unknown): InValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint' || value instanceof ArrayBuffer || value instanceof Uint8Array) return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  throw new Error('Unsupported SQL parameter.');
}
export class SqlStatement {
  constructor(readonly sql: string, readonly args: InValue[] = []) {}
  bind(...values: unknown[]) { return new SqlStatement(this.sql, values.map(argument)); }
  async run() { const result = await getClient().execute(this); return { success: true, meta: { changes: result.rowsAffected } }; }
  async all<T = Record<string, any>>(): Promise<{ results: T[] }> { const result = await getClient().execute(this); return { results: result.rows.map(row => ({ ...row }) as T) }; }
  async first<T = Record<string, any>>(): Promise<T | null> { return (await this.all<T>()).results[0] ?? null; }
}
const database = {
  prepare(sql: string) { return new SqlStatement(sql); },
  async batch(statements: SqlStatement[]) {
    // One write transaction: any failure rolls back stock, orders and coupons.
    return getClient().batch(statements, 'write');
  },
};
export function db() { return database; }
export function runtime(key:string):string {
  if (key === 'SITE_ORIGIN' && !process.env.SITE_ORIGIN && process.env.VERCEL_PROJECT_PRODUCTION_URL) return 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return process.env[key] ?? '';
}
export const uid=()=>crypto.randomUUID();
export const now=()=>new Date().toISOString();
export async function all<T=Record<string,any>>(sql:string, values:unknown[]=[]):Promise<T[]> { const r=await db().prepare(sql).bind(...values).all<T>(); return r.results; }
export async function one<T=Record<string,any>>(sql:string, values:unknown[]=[]):Promise<T|null> { return db().prepare(sql).bind(...values).first<T>(); }
export function statement(sql:string, values:unknown[]=[]){return db().prepare(sql).bind(...values);}
export function insert(table:string,record:Record<string,unknown>,ignore=false){const keys=Object.keys(record);return statement(`INSERT ${ignore?'OR IGNORE ':''}INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,Object.values(record));}
export function update(table:string,record:Record<string,unknown>,id:string){const keys=Object.keys(record);return statement(`UPDATE ${table} SET ${keys.map(k=>k+'=?').join(',')} WHERE id=?`,[...Object.values(record),id]);}
export function guard(sql:string,values:unknown[]=[]){return statement('INSERT INTO transaction_guards (id,valid) VALUES (?, CASE WHEN ('+sql+') THEN 1 ELSE 0 END)',[uid(),...values]);}
export function clearGuards(){return statement('DELETE FROM transaction_guards');}
export function auditRecord(actor:string,action:string,resource:string,before:unknown='',after:unknown=''){return insert('audit',{id:uid(),actor,action,resource,before_value:JSON.stringify(before),after_value:JSON.stringify(after),created_at:now()});}
