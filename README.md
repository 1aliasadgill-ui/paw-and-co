# Paw & Co.

A full-stack Pakistan pet supplies storefront with secure administration, persistent SQL orders and inventory, customer accounts, content management and reports. The initial release is in **sample mode**. Its twelve illustrative products and sixteen variants are not verified goods for sale. Sample orders do not charge a payment method or promise delivery, and are excluded from revenue and best-seller calculations.

## First use

1. Connect a Turso Cloud database and a public Vercel Blob store to the Vercel project. The deployment build validates configuration and applies versioned migrations before publishing.
2. Enable `ALLOW_OWNER_SETUP=true` and configure a random `OWNER_SETUP_SECRET` of at least 32 characters in the project's secret environment settings, then redeploy.
3. Open **Store management** in the footer (`/admin`). Enter the setup key, your name, email and a password of at least twelve characters. No default administrator or shared password exists.
4. Set `ALLOW_OWNER_SETUP=false`, remove `OWNER_SETUP_SECRET`, and redeploy. The atomic one-time database guard already prevents a second administrator bootstrap.
5. Explore Products, Categories, Brands, Orders, Inventory, Discounts, Content, Reports and Settings. Test orders remain labelled and never charge a payment method.

Vercel administrator setup never trusts client-supplied Cloudflare or ChatGPT identity headers.

## What is implemented

| Area | Behavior |
| --- | --- |
| Storefront | Editorial home, responsive menu, configurable sections/banners, dynamic pet types, search suggestions, filters, sorting, pagination, product gallery, variants, wishlist and cart |
| Checkout | Guest or account checkout, Pakistani mobile validation, manually entered cities, province and city rates, parcel weight, free shipping threshold, pickup, discount rules, COD limits and bank transfer |
| Orders | Server-calculated quote, idempotent submission, atomic stock/discount/order/outbox transaction, status history, ownership checks, cancellation restocking, tracking and printable details |
| Accounts | Email/password registration and login, addresses, profile and password changes, order history, returns and verified review submission |
| Admin | Five staff roles, product and variant editor, image uploads, stock adjustments/history, product CSV import/export, order/customer records, review moderation, discounts, CMS, banners and settings |
| Reporting | Real delivered-order revenue net of refunds, order statuses, city totals, Pakistan date filters, exports and low-stock alerts; sample activity is excluded |
| Content | Plain Markdown with live preview, drafts, publication dates, articles, FAQ, policy pages, contact inbox and newsletter consent |
| SEO | Metadata, canonical URLs when configured, live-product structured data, robots and sitemap; sample mode blocks indexing |
| Storage | 28 SQLite tables with indexes, foreign keys and constraints; Vercel Blob images; no production data in localStorage |
| Email | Durable order/reset/status outbox, Resend delivery when configured, idempotent sends and manual retries; sample messages never send |

Customer baskets are identified by an opaque browser cookie and persist for thirty days. Saved account wishlists and orders are available after sign-in; registration/sign-in links the current guest wishlist and previously unclaimed browser orders. Cart contents do not synchronize between different browsers. Account sessions expire after seven days and admin sessions after eight hours. The checkout draft uses sessionStorage only for temporary form recovery and is removed after success.

## Roles

| Role | Permissions |
| --- | --- |
| Super administrator | All areas, staff, environment-dependent email queue and settings |
| Manager | Products, inventory, orders, customers, categories, brands, discounts, content, reviews, marketing and reports |
| Order manager | Orders, returns/refunds and customer records |
| Inventory manager | Products, inventory, categories and brands |
| Content editor | Content, banners and newsletter records |

Every admin request checks the role on the server. Changing a staff member or blocking a customer invalidates their existing sessions. At least one active super administrator must remain.

## Local development and build

Requires Node 24. The app uses native Next.js 16 App Router, React 19, TypeScript, Tailwind, Radix/shadcn components, Zod and Drizzle schema definitions. Its persistent production database is Turso/libSQL; image uploads use Vercel Blob.

```sh
npm ci
npm run db:migrate
npm run dev
npm test
npm run build
```

Create an ignored `.env.local` containing the values shown in `.env.example` before migrating. A `file:work/development.db` URL is supported only for local development. Vercel builds require a real remote database and image store; they never fall back to ephemeral files or mock data.

Migrations are applied atomically, recorded with checksums, and skipped on subsequent runs. The seed runs idempotently on the first database request. It adds sample catalog data but no staff credentials, customers, reviews or orders.

## Deploy to Vercel

After signing in with the Vercel CLI:

```sh
vercel link
vercel integration add tursocloud
vercel env pull .env.local
vercel deploy
```

Connect a public Blob store from the project's Storage tab and select the required environments. Configure `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` and `BLOB_READ_WRITE_TOKEN` before deploying. `vercel.json` selects Next.js, Node 24, the Mumbai function region, and a build command that checks storage, applies migrations and builds the app. Use a separate database for preview testing when real customer data exists.

Verify the deployment with `vercel curl /api/catalog --deployment <returned-url>` and inspect checkout and administrator access. Deploy production with `vercel deploy --prod` once the preview is working. Keep deployment protection enabled. The `deploy/vercel` branch contains this native Vercel version; the original Cloudflare version remains on `main`.

## Runtime configuration

See `.env.example`. Production secrets belong in Vercel project settings. `SITE_ORIGIN` is the actual HTTPS store URL; when omitted on Vercel, the app uses `VERCEL_PROJECT_PRODUCTION_URL`. `EMAIL_API_KEY` is a Resend key and `EMAIL_FROM` must be a verified sender. Password reset explains missing email setup when these values are absent. Pending email can be retried from **Email queue**; attempts are capped at five.

Wallet/card payments are not enabled. `lib/payments.ts` defines the extension contract for JazzCash, Easypaisa, PayFast, Safepay or a card provider. A merchant agreement, current official API documentation, provider-specific code, webhook verification, transaction reconciliation and sandbox tests are required before enabling any online provider. No fake success screen or invented gateway credential exists. Bank transfers are manually verified; refund forms record money already returned and do not transfer funds.

## Catalog and content operations

- Create a category with type **pet** to add a new pet type to the home tiles, navigation, filters and product editor. Upload a category photograph for new types. Department categories can have parents and descriptive attributes. Product filter attributes currently include life stage and flavour; other attributes appear on the product page.
- Product CSV uses one row per variant. Required columns: `name`, `sku`, `brand_id`, `category_id`. Rows with the same `slug` are grouped. Matching slugs and SKUs update existing products and variants while retaining their IDs and omitted variants. Export provides a round-trip template. Imports process up to 200 rows and report partial completion if a row fails.
- To preserve order history, existing variants cannot be removed in the editor. Set stock to zero or archive the product. Referenced products cannot be deleted. Product images accept JPEG, PNG and WebP up to 4 MB and are stored in Vercel Blob.
- Returns record customer requests and review statuses. Received returns do not automatically restock inventory: inspect condition, then make a documented inventory adjustment. Cancellation before shipment restores stock automatically and only once.
- CMS content is rendered as a small safe Markdown subset, without raw HTML. Homepage navigation and sections are editable in Settings. Category hierarchies are stored and protected against cycles; departments are currently presented in a flat shopper filter.

## Security and data integrity

Passwords use scrypt with a unique random salt (`N=32768, r=8, p=3`) and constant-time comparison. Session tokens and guest basket tokens are random; only their SHA-256 hashes are persisted. Cookies use HttpOnly, SameSite=Lax and Secure on the hosted HTTPS site. CSRF checks reject cross-origin writes. SQL values are bound parameters; dynamic table names come from internal resource allowlists. Input sizes, types and URLs are validated. Supplier costs are omitted from public catalog and basket responses. React escapes customer text, and uploaded images are signature checked.

Checkout revalidates price, availability, shipping, COD eligibility and discounts before an atomic batch. Guards reject stale basket snapshots and concurrent edits. Database stock constraints prevent overselling, and idempotency keys prevent duplicate orders. Order item names/SKUs/prices remain immutable snapshots. Refund totals cannot exceed the order's recorded total or be erased by a later payment-state edit.

The app runs in Vercel's Node.js runtime. Rate limits use Vercel's overwritten `x-forwarded-for` header only when running on Vercel. Administrator bootstrap requires the server-configured setup key and a one-time database guard.

## Verification

`tests/commerce.test.mjs` executes the actual API and commerce modules against an isolated SQLite database and request-cookie context. It covers 48 critical checks: server totals, delivery rates, discount limits, price/stock/basket races, idempotency, order isolation, registration/login, owner setup, resource permissions, CSV variants, inventory constraints, refunds and review eligibility. Expected rejected transactions appear in the test logs. It does not mutate the running store.

The local storefront was inspected in Chromium, with responsive home layouts at 360, 390, 430, 768, 1024, 1280, 1440 and 1920 CSS pixels. Final browser checkout results and build outcome are recorded in `docs/verification.md`. Safari, Firefox, real devices, merchant settlement and actual email delivery require separate environment-specific verification.

## Before accepting live customers

Replace illustrative products, prices, stock, images and specifications with approved supplier data. Set the business name, contact/address, delivery coverage and prices, dispatch promises and actual return terms. Finalize the privacy and trading policy pages. Configure a real email sender and verify order/status/reset delivery. Complete one controlled COD order and one refund-record reconciliation. Then disable sample mode in Settings; sample products will be hidden from live shoppers. Public access and a custom domain are separate deployment choices.

Back up the production database with the platform's supported database backup/export facility and keep an export of Vercel Blob media. CSV reports are useful operational exports, not a complete database backup. Before schema changes, take a backup and verify restoration in an isolated environment. Keep financial order history according to the business's retention policy; handle customer access/deletion requests from the contact inbox. Rate-limit/session/reset-token cleanup and retry monitoring should be scheduled as the store's traffic grows.

This release contains the working commerce system and payment extension architecture. It is not yet a configured live retail business. Multi-warehouse inventory, subscriptions, automated courier APIs, tax-accounting integration, fuzzy typo search, multi-factor authentication and provider-specific online payments remain future extensions.
