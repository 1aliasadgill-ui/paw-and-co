# Vercel migration verification

Verified on 12 September 2026, before account provisioning and deployment.

- Native Next.js 16 production build and TypeScript check pass.
- All 48 integration checks pass using the actual libSQL database adapter and an isolated local SQLite database. These include full checkout, stock and basket races, refunds, administrator permissions and spoofed owner-header rejection.
- The migration runner applies both schema migrations and skips them safely on a second run.
- Production deployment checks require remote Turso credentials and Vercel Blob storage. Local test data and credentials are excluded from deployment.
- Vercel account sign-in, remote storage provisioning, actual Blob uploads and live Vercel verification remain pending.

The following records describe the original storefront verification before its hosting migration.

# Release verification

Verified on 10–11 September 2026.

## Automated integration suite

All 46 checks in `tests/commerce.test.mjs` passed. The suite runs actual application modules with isolated request cookies and a transaction-capable SQLite adapter. It exercises:

- Catalog initialization, dynamic pet types, published/draft visibility and private supplier costs.
- Cross-origin write rejection, guest basket isolation and stock bounds.
- Pakistani phone validation, configured city rates and manually entered cities.
- Order persistence, immutable price snapshots, idempotent retries and ownership checks.
- Full transaction rollback on price, stock and basket changes; disabled-brand rejection.
- Discount calculation, atomic usage counting and usage limits.
- Password hashing, registration, login, owner bootstrap and five-role permission model.
- Inventory adjustments, cancellation restocking exactly once, payment states and refund limits.
- Sample revenue/email exclusion, review eligibility and unconfigured reset behavior.
- CSV variant grouping, stock update and preservation of existing variant identities.

TypeScript compilation completed without errors.

## Browser checks

Chromium local preview:

- Homepage rendered with the intended forest green/cream design and optimized product/pet imagery.
- Responsive homepage checked at iframe viewport widths of 360, 390, 430, 768, 1024, 1280, 1440 and 1920 pixels. Document scroll width matched client width at every setting. Browser scrollbars occupy 15 pixels within these desktop-emulated viewports.
- Mobile filter drawer opened correctly; selecting Dogs changed the listing from 12 products to 5.
- Product variant selection changed the dog food from 2 kg / Rs. 3,299 to 4 kg / Rs. 5,938.
- Add to basket displayed the chosen variant, quantity, subtotal and free-delivery eligibility.
- Guest checkout accepted a manually entered Pakistani address, normalized the test mobile number and displayed the server-calculated total.
- Submitting one **sample COD order** produced a saved confirmation for Rs. 5,938, free delivery and payment status Unpaid. The page explicitly stated that no payment or delivery would occur.
- Fixed an HTTP-preview browser compatibility issue with `crypto.randomUUID`; fallback uses cryptographically secure `getRandomValues`.

Admin authentication and mutations were exercised through the integration harness. Interactive admin browser authentication was not performed because first-owner setup is restricted to the signed-in private owner. Actual merchant payments, email delivery, courier integration, Safari, Firefox, real mobile devices and production traffic load have not been tested. No real customer order or external payment was created.

The private deployment starts from migrations and seed data, independently of the local preview test database. Local test customers, orders and login credentials are not packaged.

WebMCP search and basket tools are feature-detected in the storefront. The local HTTP browser did not expose modelContext, so invoking these tools was unavailable in this preview. Ordinary shopping controls remain fully usable.
