@AGENTS.md

# Kestrel & Co. — e-commerce demo store

Portfolio demo built by Emmanuel Kelvin. It must look like a polished, real online shop, but
everything about it is fictional and no real money ever moves.

## Demo-only rules (non-negotiable)

- The brand is the fictional **"Kestrel & Co."**. Do not use "Northwind Goods" (a real company)
  or any other real brand, trademark or product name.
- Products, reviews, people and addresses are fake. Emails use `example.com`.
- Every page shows the visible Demo banner (`DemoBanner` in the root layout) and the footer line
  **"Demo store. No real orders. Paystack test mode."**
- Product visuals are generated in code (`ProductImage`, SVG/CSS). Never hotlink, download or
  commit photos or any copyrighted imagery.
- Payments use **Paystack in test mode only** (NGN). Never process real payments: the server
  refuses any secret key that doesn't start with `sk_test_`.

## Secrets and environment

- `PAYSTACK_SECRET_KEY` is **server-side only**: read it via `process.env.PAYSTACK_SECRET_KEY`
  in server code (files that `import "server-only"`). Never import it into client code, never
  log it, never commit it, never put it in an error message.
- The only public variables are `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_PORTFOLIO_URL` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` (`pk_test_…`). Don't add other
  `NEXT_PUBLIC_` values that carry secrets.
- `.env.example` is committed; every other `.env*` file is git-ignored.

## Money

- Currency is **NGN**. Prices are integers in **kobo** (₦1 = 100 kobo). Never use floats for
  money; format only at the edges with `formatPrice` (`Intl.NumberFormat("en-NG", { style:
"currency", currency: "NGN" })`).
- Prices are computed on the server from the server-side catalogue (`src/data/products.ts`) via
  `priceCart` (`src/lib/shop/pricing.ts`). Never trust prices, totals or product data sent by
  the client: resolve each line by product id and re-price it.
- Pricing rules: free shipping when the subtotal is ₦75,000 or more (>= 7_500_000 kobo),
  otherwise ₦3,500; 7.5% VAT on the subtotal, rounded half up to the kobo with integer maths
  (`percentOfKobo`); keep `priceCart` pure and covered by tests.

## Paystack checkout

- Server only: `src/lib/paystack/server.ts` (imports `server-only`) talks to the Paystack REST
  API with `fetch`. It refuses any key that isn't `sk_test_` and must never echo the key in
  errors. `PAYSTACK_API_BASE_URL` may only point at a local mock (tests).
- `initializeCheckout` / `verifyCheckout` (Server Actions in `src/app/checkout/actions.ts`) are
  public endpoints: validate every input with Zod. The browser sends only product ids, variants,
  quantities and customer fields; the server re-prices with `repriceCart`.
- Verification accepts ONLY status `success`, currency `NGN` and an amount equal to the total
  re-computed from the metadata cart lines (`evaluateTransaction`). Keep that logic pure and
  covered by unit tests with mocked Paystack responses. Never call the real Paystack API in
  tests, and never attempt a real payment.
- References are `kc-` + 32 hex chars and are the Firestore order id (one payment, one order).
- Customer details on checkout are fake demo data; say so in the UI.

## Firebase

- Client SDK only (Auth anonymous + Firestore). Visitors are signed in anonymously **on demand**
  (checkout or orders), never on first page view.
- Orders live at `users/{uid}/orders/{paystackReference}` and are written by the browser after
  server verification (not tamper-proof; fine for this sandbox, see README "Production notes").
- `firestore.rules` is deny-by-default and allows only the status transitions in
  `src/lib/orders/status.ts`; keep both, and the rules tests in `tests/rules`, in sync. The
  rules are pasted into the Firebase console manually; don't deploy them from here. When the
  rules change, say so clearly: the owner must republish them.

## UI quality bar

- Accessibility: semantic HTML and landmarks, full keyboard navigation, visible focus, WCAG AA
  contrast in both themes, labels for every control, live regions for cart updates, honour
  `prefers-reduced-motion`.
- Mobile-first. Check layouts at 375, 768 and 1280 px with no horizontal overflow.
- Light/dark theme without a flash: the inline script in the root layout sets the theme class
  before paint; keep it in sync with `ThemeProvider`.
- Components: shadcn/ui (Radix) in `src/components/ui`, app components in `src/components`.

## Next.js 16 notes

- Read `AGENTS.md` and the docs in `node_modules/next/dist/docs/` before using an API you are
  unsure about. `cacheComponents` and `partialPrefetching` are on.
- `useSearchParams` must sit under a `<Suspense>` boundary.
- Pages are kept alive with React `<Activity>` on navigation; reset transient UI (menus,
  dialogs) explicitly.
- If the dev overlay flags a page behind a client auth gate as blocking, export
  `instant = false` from that page as the docs describe.

## Definition of done

Run all of these and make sure they pass before declaring a task done:

```bash
npm run lint
npm run format:check
npm test
npm run test:rules   # needs Java for the Firestore emulator
npm run build
```

For checkout or orders changes, also run the browser tests (see README):
`npm run test:e2e` and `npm run test:e2e:checkout` (emulators + local mock Paystack).
