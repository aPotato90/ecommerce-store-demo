# ecommerce-store-demo

**Kestrel & Co.** is a portfolio demo of a modern online shop built by
[Emmanuel Kelvin](https://example.com). It's meant to look and behave like a real store, but the
brand, the products and the reviews are all made up, and payments run through
**Stripe test mode only**.

> **Demo disclaimer.** This is not a real business. Nothing is for sale, nothing ships and no
> real payment is ever taken. Use only Stripe test cards. Contact addresses use `example.com`.

<!-- Screenshot placeholder: add docs/screenshot.png and uncomment the line below. -->
<!-- ![Kestrel & Co. storefront](docs/screenshot.png) -->

_Screenshot coming soon._

## Features

- **Storefront.** Home page with a hero, featured products, category tiles and a trust strip.
  `/shop` has search, a category filter, a price range, sorting and "load more", all kept in the
  URL so any view can be shared or bookmarked. Each product has its own page with variants
  (colour or size), a quantity picker, related products and unique metadata.
- **Cart.** Saved to `localStorage` and validated with Zod on load, so tampered data can't break
  the app. It still works when storage is blocked. You get a cart drawer and a full `/cart` page
  with stock limits, a free-shipping progress bar, undo after removing an item and
  screen-reader announcements.
- **Pricing on the server's terms.** `priceCart` is a pure, tested function: line totals, free
  shipping over $75 (otherwise a flat $6) and a flat 7.5% tax, all in integer cents. The cart only
  stores product ids and quantities. Prices always come from the catalogue.
- **Firebase.** Anonymous auth only starts when a visitor needs it (orders now, checkout next),
  never on first page view. Orders live at `users/{uid}/orders/{orderId}`, protected by
  deny-by-default security rules with field validation. The rules are covered by emulator tests.
- **Generated product art.** Every product image is an SVG illustration drawn in code. There
  are no photos and no hotlinked images.
- **Quality.** Semantic HTML, keyboard support, visible focus, WCAG AA contrast, light and dark
  themes with no flash on load, `prefers-reduced-motion` support and a mobile-first layout
  checked at 375, 768 and 1280 px. Axe-core audits are part of the browser QA script.

Stripe Checkout is the next milestone. For now the Checkout button on `/cart` is disabled.

## Tech stack

| Area        | Tools                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Cache Components), React 19, TypeScript strict |
| UI          | Tailwind CSS v4, shadcn/ui (Radix), lucide-react, sonner               |
| Data & auth | Firebase client SDK: Auth (anonymous) + Firestore                      |
| Payments    | Stripe server SDK, **test mode only** (checkout coming next)           |
| Validation  | Zod, React Hook Form                                                   |
| Testing     | Vitest, Firebase rules-unit-testing + emulator, Playwright + axe-core  |
| Tooling     | ESLint, Prettier (with the Tailwind plugin), npm                       |

## Getting started

Requirements: **Node.js 20.9+** (22 recommended) and npm. The Firestore emulator used by
`npm run test:rules` and `npm run emulators` also needs **Java 11+**.

```bash
git clone https://github.com/apotato90/ecommerce-store-demo.git
cd ecommerce-store-demo
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

The storefront and cart work without any keys. Firebase is only needed for guest sessions and
order history. Stripe is only needed for checkout.

### 1. Create a Firebase project

1. In the [Firebase console](https://console.firebase.google.com/), create a project (Google
   Analytics is optional).
2. **Build → Authentication → Get started → Sign-in method**: enable **Anonymous**.
3. **Build → Firestore Database → Create database**: pick a location and start in
   **production mode**.
4. **Firestore → Rules**: paste the contents of [`firestore.rules`](./firestore.rules) and
   publish. The rules are deliberately not deployed from this repo.
5. **Project settings → General → Your apps**: add a **Web app** and copy its config values into
   the `NEXT_PUBLIC_FIREBASE_*` variables in `.env.local`.
6. **Authentication → Settings → Authorized domains**: add your deployment's domain.

### 2. Get Stripe test keys

1. Create a free [Stripe](https://dashboard.stripe.com/register) account. You don't need to
   activate payments.
2. Make sure the dashboard is in **Test mode**.
3. **Developers → API keys**: copy the **Secret key** that starts with `sk_test_` into
   `STRIPE_SECRET_KEY` in `.env.local`. Never use an `sk_live_` key with this project.

### Environment variables

| Variable                                   | Visibility      | Purpose                                                 |
| ------------------------------------------ | --------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | public          | Firebase web config                                     |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | public          | Firebase web config                                     |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | public          | Firebase web config                                     |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | public          | Firebase web config                                     |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | public          | Firebase web config                                     |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | public          | Firebase web config                                     |
| `NEXT_PUBLIC_FIREBASE_USE_EMULATORS`       | public          | `true` to use the local Auth + Firestore emulators      |
| `NEXT_PUBLIC_SITE_URL`                     | public          | Canonical site URL (metadata, future Stripe redirects)  |
| `NEXT_PUBLIC_PORTFOLIO_URL`                | public          | Portfolio link in the footer                            |
| `STRIPE_SECRET_KEY`                        | **server only** | Stripe test secret key. Never expose, log or commit it. |

Firebase web config values are not secrets: they identify the project, and access is enforced
by `firestore.rules`. Only `.env.example` is committed. Every other `.env*` file is git-ignored.

### Running against the Firebase emulators

No Firebase project is needed for local development:

```bash
npm run emulators                                   # Auth :9099 + Firestore :8080 (project demo-kestrel)
NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true npm run dev # in a second terminal
```

## Test payments

When checkout ships, use Stripe's test card:

| Field       | Value                       |
| ----------- | --------------------------- |
| Card number | `4242 4242 4242 4242`       |
| Expiry      | any future date, e.g. 12/34 |
| CVC         | any 3 digits                |
| ZIP         | any                         |

Real cards will not work. The store runs in Stripe test mode only.

## Scripts

| Command              | What it does                                                     |
| -------------------- | ---------------------------------------------------------------- |
| `npm run dev`        | Start the dev server                                             |
| `npm run build`      | Production build                                                 |
| `npm start`          | Serve the production build                                       |
| `npm run lint`       | ESLint                                                           |
| `npm run typecheck`  | Generate route types and run `tsc`                               |
| `npm run format`     | Format with Prettier (`format:check` to verify)                  |
| `npm test`           | Unit tests (pricing, catalogue, filters, cart storage)           |
| `npm run test:rules` | Firestore security rules tests on the emulator (needs Java)      |
| `npm run emulators`  | Start the Auth + Firestore emulators                             |
| `npm run test:e2e`   | Browser QA + axe-core audit against a running server (see below) |

`test:e2e` drives Chromium through the main flows (search, filters, URL state, add to cart,
persistence, undo, stock limits, mobile menu, blocked storage) and runs axe-core on every main
page at 375, 768 and 1280 px in both themes:

```bash
npx playwright install chromium   # first time only
npm run build && npm start        # in one terminal
npm run test:e2e                  # in another (BASE_URL defaults to http://localhost:3000)
```

## Project structure

```
src/
  app/                 Routes: /, /shop, /shop/[slug], /cart, /orders, not-found
  components/
    cart/              Cart provider, drawer, line items, summary
    product/           ProductImage (SVG art), cards, rating, buy box
    layout/            Header, footer, demo banner, theme toggle, mobile menu
    shop/              URL-driven product browser
    auth/ orders/      On-demand anonymous auth, order history
    ui/                shadcn/ui components
  data/products.ts     Fictional catalogue (server-side source of truth)
  lib/
    shop/              Types, Zod schemas, priceCart, filters, catalogue helpers
    cart/              localStorage cart store
    firebase/          Client init, auth helpers, order model
  proxy.ts             Real 404 status for unknown product slugs
firestore.rules        Security rules (paste into the Firebase console)
tests/rules/           Emulator tests for the rules
scripts/e2e.mjs        Playwright + axe-core browser QA
```

## Notes

- **Order size.** Carts and orders are capped at 6 different products (up to 10 of each).
  Firestore rules can't loop, so each order line is checked one by one, and one rule evaluation
  is limited to 1000 expressions. The tests include a worst-case 6-line order to guard this
  limit.
- **No indexing.** The site sets `noindex` so the demo doesn't show up next to real shops.

---

Demo store. No real orders. Stripe test mode. Built by Emmanuel Kelvin.
