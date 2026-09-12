import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Exercise the actual API and libSQL adapter against an isolated local file.
// Only Next.js request cookies/headers are replaced by request-scoped fixtures.
mkdirSync('work', { recursive: true });
const databasePath = resolve('work/integration-' + crypto.randomUUID() + '.db');
process.env.TURSO_DATABASE_URL = 'file:' + databasePath;
delete process.env.VERCEL;
globalThis.__requestContext = new AsyncLocalStorage();
const sql = new DatabaseSync(databasePath);
sql.exec('PRAGMA foreign_keys=ON');
for (const file of readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort()) sql.exec(readFileSync('drizzle/' + file, 'utf8'));
let beforeBatch;
await build({
  stdin: { contents: "export { GET, POST, PATCH, DELETE } from './app/api/[...path]/route'; export { getClient } from './lib/db';", resolveDir: process.cwd() }, external: ['@libsql/client', '@vercel/blob'], bundle: true, platform: 'node', format: 'esm', outfile: 'work/test-api.mjs',
  plugins: [{ name: 'isolated-request', setup(build) {
    build.onResolve({ filter: /^next\/headers$/ }, args => ({ path: args.path, namespace: 'test' }));
    build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export async function cookies(){return globalThis.__requestContext.getStore().cookies;} export async function headers(){return globalThis.__requestContext.getStore().headers;}' }));
  } }]
});
const api = await import(pathToFileURL(resolve('work/test-api.mjs')));
const client = api.getClient();
const actualBatch = client.batch.bind(client);
client.batch = async (...args) => {
  if (beforeBatch) { const hook = beforeBatch; beforeBatch = null; hook(); }
  return actualBatch(...args);
};
const jar = () => { const values = new Map(); return { get: key => values.has(key) ? { value: values.get(key) } : undefined, set: (key, value) => values.set(key, value) }; };
const guest = jar(), stranger = jar(), customer = jar(), owner = jar(), staff = jar();
async function request(path, body, cookies = guest, extraHeaders = {}, method) {
  const verb = method || (body === undefined ? 'GET' : 'POST');
  const headers = new Headers({ host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', ...extraHeaders });
  return globalThis.__requestContext.run({ cookies, headers }, async () => {
    const response = await api[verb](new Request('http://localhost/api/' + path, { method: verb, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), { params: Promise.resolve({ path: path.split('?')[0].split('/') }) });
    return { status: response.status, data: await response.json() };
  });
}
let checks = 0;
function check(condition, label) { assert.ok(condition, label); console.log('PASS ' + label); checks++; }
const catalog = await request('catalog');
check(catalog.data.products.length === 12 && catalog.data.categories.filter(c => c.kind === 'pet').length === 5, 'Seeded catalog and dynamic pet categories');
check(!('cost' in catalog.data.products[0].variants[0]), 'Public catalog does not expose supplier cost');
check((await request('admin/products')).status === 401, 'Unauthenticated admin access denied');
check((await request('cart', { variant_id: 'sample-1-v1', quantity: 1 }, guest, { origin: 'https://evil.example' })).status === 403, 'Cross-origin mutation denied');
check((await request('cart', { variant_id: 'sample-1-v1', quantity: 25 })).status === 400, 'Cart quantity cannot exceed stock');
const added = await request('cart', { variant_id: 'sample-1-v1', quantity: 1 });
check(added.data.subtotal === 3299 && !('cost' in added.data.items[0].variant), 'Cart persists correct price without supplier cost');
check((await request('cart')).data.items.length === 1 && !(await request('cart', undefined, stranger)).data.items.length, 'Guest baskets remain isolated');
const buyer = { name: 'Test Customer', email: 'buyer@example.invalid', phone: '+92 300 1234567', address: '123 Test Street, Example Area', city: 'Lahore', province: 'Punjab', payment_method: 'cod', delivery_method: 'delivery', coupon: '', accept: true, request_key: crypto.randomUUID() };
const quote = (await request('quote', buyer)).data;
check(quote.shipping === 200 && quote.total === 3499 && quote.methods.includes('cod'), 'Pakistan city delivery and COD quote');
check((await request('quote', { ...buyer, coupon: 'NO-SUCH-CODE' })).status === 400, 'Invalid discount rejected');
check((await request('orders', { ...buyer, quote_token: quote.quote_token, phone: '123' })).status === 400, 'Invalid Pakistani phone rejected');
const placed = await request('orders', { ...buyer, quote_token: quote.quote_token });
check(placed.status === 200 && placed.data.number?.startsWith('PAW-'), 'Guest checkout creates a persisted order');
const orderId = placed.data.id;
check(sql.prepare('SELECT stock FROM variants WHERE id=?').get('sample-1-v1').stock === 23, 'Stock decremented exactly once');
const repeated = await request('orders', { ...buyer, quote_token: quote.quote_token });
check(repeated.data.id === orderId && sql.prepare('SELECT COUNT(*) n FROM orders').get().n === 1, 'Duplicate submission is idempotent');
check((await request('orders/' + orderId, undefined, stranger)).status === 404, 'Order ownership enforced');
check((await request('cart')).data.items.length === 0, 'Basket cleared after committed order');
check(sql.prepare("SELECT COUNT(*) n FROM outbox WHERE status='sample'").get().n === 1, 'Sample order email never sent');
await request('cart', { variant_id: 'sample-1-v1', quantity: 1 });
const stale = (await request('quote', buyer)).data;
sql.prepare('UPDATE variants SET price=price+100 WHERE id=?').run('sample-1-v1');
check((await request('orders', { ...buyer, request_key: crypto.randomUUID(), quote_token: stale.quote_token })).status === 409, 'Changed price requires a fresh checkout review');
sql.prepare('UPDATE variants SET price=price-100 WHERE id=?').run('sample-1-v1');
const fresh = (await request('quote', buyer)).data;
beforeBatch = () => sql.prepare('UPDATE basket_items SET quantity=2 WHERE variant_id=?').run('sample-1-v1');
check((await request('orders', { ...buyer, request_key: crypto.randomUUID(), quote_token: fresh.quote_token })).status === 409 && sql.prepare('SELECT stock FROM variants WHERE id=?').get('sample-1-v1').stock === 23, 'Concurrent basket change aborts the entire order transaction');
await request('cart', { variant_id: 'sample-1-v1', quantity: 1, mode: 'set' });
const stockQuote = (await request('quote', buyer)).data;
beforeBatch = () => sql.prepare('UPDATE variants SET stock=0 WHERE id=?').run('sample-1-v1');
check((await request('orders', { ...buyer, request_key: crypto.randomUUID(), quote_token: stockQuote.quote_token })).status === 409 && sql.prepare('SELECT COUNT(*) n FROM orders').get().n === 1, 'Last-stock race rolls back order, stock log and email');
sql.prepare('UPDATE variants SET stock=23 WHERE id=?').run('sample-1-v1');
sql.prepare('UPDATE brands SET active=0 WHERE id=?').run('paw-co');
check((await request('quote', buyer)).status === 400, 'Disabled brand cannot be purchased from an existing basket');
sql.prepare('UPDATE brands SET active=1 WHERE id=?').run('paw-co');
const testPassword = crypto.randomUUID() + '-aA7';
check((await request('auth/register', { name: 'Test Customer', email: 'customer@example.invalid', password: testPassword }, customer)).status === 200, 'Customer registration with hashed password');
check((await request('admin/orders', undefined, customer)).status === 403, 'Customer role cannot access orders administration');
await request('auth/logout', {}, customer);
check((await request('auth/login', { email: 'customer@example.invalid', password: testPassword }, customer)).status === 200, 'Email and password authentication');
process.env.ALLOW_OWNER_SETUP = 'true';
const setupKey = crypto.randomUUID() + crypto.randomUUID();
process.env.OWNER_SETUP_SECRET = setupKey;
const ownerHeaders = { 'oai-authenticated-user-id': 'isolated-test-owner', 'oai-authenticated-user-email': 'owner@example.invalid' };
check((await request('admin/bootstrap', { name: 'Test Owner', email: 'owner@example.invalid', password: testPassword }, owner, ownerHeaders)).status === 403, 'Forged Cloudflare owner headers do not grant administrator access');
check((await request('admin/bootstrap', { name: 'Test Owner', email: 'owner@example.invalid', password: testPassword, setup_key: 'incorrect-key' }, owner)).status === 403, 'Incorrect administrator setup key rejected');
check((await request('admin/bootstrap', { name: 'Test Owner', password: testPassword }, owner)).status === 403, 'Owner setup requires the private setup key');
check((await request('admin/bootstrap', { name: 'Test Owner', email: 'owner@example.invalid', password: testPassword, setup_key: setupKey }, owner, ownerHeaders)).status === 200, 'First administrator bootstrap');
check((await request('admin/bootstrap', { name: 'Test Owner', email: 'owner@example.invalid', password: testPassword, setup_key: setupKey }, owner, ownerHeaders)).status === 409, 'First administrator can only be created once');
check((await request('admin/dashboard', undefined, owner)).data.revenue === 0, 'Sample orders excluded from sales reports');
const category = await request('admin/categories', { name: 'Reptiles', slug: 'reptiles', kind: 'pet' }, owner);
check(category.status === 200 && (await request('catalog')).data.categories.some(c => c.slug === 'reptiles' && c.kind === 'pet'), 'New pet type becomes available through admin');
const adminProducts = (await request('admin/products', undefined, owner)).data;
check('cost' in adminProducts[0].variants[0], 'Supplier cost remains available to permitted administrators');
const newProduct = await request('admin/products', { name: 'Test accessory', slug: 'test-accessory', brand_id: 'paw-co', category_id: 'toys', pet: category.data.id, status: 'draft', variants: [{ label: 'Standard', sku: 'QA-ACCESSORY', price: 1000, stock: 3 }] }, owner);
check(newProduct.status === 200 && !(await request('catalog')).data.products.some(p => p.id === newProduct.data.id), 'Admin product creation preserves draft visibility');
check((await request('admin/inventory', { variant_id: 'sample-12-v1', adjustment: -100, reason: 'Invalid adjustment test' }, owner)).status === 409, 'Inventory adjustment cannot produce negative stock');
const team = await request('admin/users', { name: 'Test Inventory', email: 'inventory@example.invalid', role: 'inventory_manager', password: testPassword }, owner);
await request('auth/login', { email: 'inventory@example.invalid', password: testPassword }, staff);
check(team.status === 200 && (await request('admin/inventory', undefined, staff)).status === 200 && (await request('admin/users', undefined, staff)).status === 403, 'Staff permissions enforced by resource');
check((await request('admin/orders/' + orderId, { status: 'Cancelled' }, owner)).status === 200 && sql.prepare('SELECT stock FROM variants WHERE id=?').get('sample-1-v1').stock === 24, 'Cancellation restores stock');
await request('admin/orders/' + orderId, { status: 'Cancelled' }, owner);
check(sql.prepare('SELECT stock FROM variants WHERE id=?').get('sample-1-v1').stock === 24, 'Repeated cancellation never restores stock twice');
check((await request('admin/refunds', { order_id: orderId, amount: 1, method: 'Bank transfer', reason: 'Refund test' }, owner)).status === 400, 'Unpaid order cannot be refunded');
await request('admin/orders/' + orderId, { payment_status: 'Paid' }, owner);
check((await request('admin/refunds', { order_id: orderId, amount: 4000, method: 'Bank transfer', reason: 'Excess refund test' }, owner)).status === 409, 'Refund cannot exceed paid order total');
check((await request('admin/refunds', { order_id: orderId, amount: 1000, method: 'Bank transfer', reason: 'Partial refund test' }, owner)).status === 200, 'Partial refund is recorded');
check((await request('admin/orders/' + orderId, { payment_status: 'Paid' }, owner)).status === 400, 'Payment edits cannot erase a refund state');
check((await request('reviews', { product_id: 'sample-1', order_id: orderId, rating: 5, content: 'This is only a verification test.' }, customer)).status === 400, 'Reviews require the customer’s delivered real order');
check((await request('auth/reset-request', { email: 'customer@example.invalid' }, customer)).status === 400, 'Unconfigured password reset explains missing email setup');

const discount = await request('admin/discounts', {code:'QATEN',type:'percentage',value:10,minimum:1000,max_uses:1,per_customer:1,active:1}, owner);
const discounted = (await request('quote', {...buyer,coupon:'QATEN'})).data;
check(discount.status===200 && discounted.discount===330 && discounted.total===3169,'Percentage discount is calculated on the server');
const withDiscount = await request('orders', {...buyer,coupon:'QATEN',request_key:crypto.randomUUID(),quote_token:discounted.quote_token});
check(withDiscount.status===200 && sql.prepare('SELECT uses FROM discounts WHERE code=?').get('QATEN').uses===1,'Discount use recorded atomically with order');
await request('cart',{variant_id:'sample-2-v1',quantity:1});
check((await request('quote',{...buyer,coupon:'QATEN'})).status===400,'Discount use limit enforced');
const arbitraryCity = (await request('quote',{...buyer,city:'Khushab'})).data;
check(arbitraryCity.shipping===250,'Manually entered Pakistani city uses fallback shipping');
await build({entryPoints:['components/admin/config.ts'],bundle:true,platform:'node',format:'esm',outfile:'work/test-import.mjs'});
const {productImports,parseCSV}=await import(pathToFileURL(resolve('work/test-import.mjs')));
const rows=parseCSV('name,slug,brand_id,category_id,sku,label,price,stock\nDog food,dog-food,paw-co,food,SKU-A,2 kg,1000,5\nDog food,dog-food,paw-co,food,SKU-B,4 kg,1800,3');
const grouped=productImports(rows,[]);
check(grouped.length===1&&grouped[0].data.variants.length===2,'CSV groups multiple variants into one product');
const updated=productImports([{...rows[0],stock:'9'}],[{id:'existing-product',slug:'dog-food',variants:[{id:'variant-a',sku:'SKU-A',label:'2 kg',price:1000,stock:5},{id:'variant-b',sku:'SKU-B',stock:3}]}]);
check(updated[0].id==='existing-product'&&updated[0].data.variants[0].id==='variant-a'&&updated[0].data.variants[1].id==='variant-b'&&updated[0].data.variants[0].stock===9,'CSV update preserves existing variant IDs and omitted variants');
console.log(`\n${checks} critical integration checks passed. Isolated database discarded.`);
client.close();
sql.close();
for (const suffix of ['','-wal','-shm']) rmSync(databasePath + suffix, { force: true });
