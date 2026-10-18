// Browser tests for checkout, the Paystack callback and orders, against the Firebase emulators
// and a LOCAL MOCK of Paystack (scripts/mock-paystack.mjs). The real Paystack API is never
// called and no real payment is attempted.
//
// Run via `npm run test:e2e:checkout` after building with the emulator flag:
//   NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true NEXT_PUBLIC_SITE_URL=http://localhost:3100 npm run build
// The npm script starts the Auth + Firestore emulators; this script starts the mock Paystack
// server and `next start` with a fake sk_test_ key pointed at the mock.
// Set CHROMIUM_PATH to use a pre-installed Chromium.

import { spawn } from "node:child_process";

import AxeBuilder from "@axe-core/playwright";
import { chromium, expect } from "@playwright/test";

import { startMockPaystack } from "./mock-paystack.mjs";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;
const MOCK_PORT = 4010;
const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;
const WIDTHS = [375, 768, 1280];
const THEMES = ["light", "dark"];
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

const failures = [];
let passed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.log(
      `  ✗ ${name}\n    ${String(error?.message ?? error)
        .split("\n")
        .slice(0, 8)
        .join("\n    ")}`,
    );
  }
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not start`);
}

const CART = (items) =>
  JSON.stringify({
    version: 1,
    items: items ?? [{ productId: "prd_aster_vase", variantId: "sage", quantity: 2 }],
  });

/** Seeds the cart once per context (not on every navigation). */
function seedCart() {
  return ([value]) => {
    if (!sessionStorage.getItem("cart-seeded")) {
      sessionStorage.setItem("cart-seeded", "1");
      localStorage.setItem("kestrel-cart", value);
    }
  };
}

async function openPage(
  browser,
  { width = 1280, theme = "light", cart, storageState } = {},
) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: theme,
    reducedMotion: "reduce",
    storageState,
  });
  if (cart !== undefined) await context.addInitScript(seedCart(), [cart]);
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    // Only our app's console matters; the mock Paystack page has no favicon.
    if (message.type() === "error" && !message.location()?.url?.startsWith(MOCK_URL)) {
      errors.push(`${message.text()} @ ${message.location()?.url ?? ""}`);
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return { context, page, errors };
}

async function cartCount(page) {
  const label = await page
    .getByRole("button", { name: /^Open cart/ })
    .getAttribute("aria-label");
  return Number(label?.match(/(\d+) item/)?.[1] ?? 0);
}

async function noHorizontalOverflow(page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  if (scrollWidth > innerWidth) {
    throw new Error(`Horizontal overflow: ${scrollWidth}px > ${innerWidth}px`);
  }
}

async function axe(page) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  if (results.violations.length > 0) {
    throw new Error(
      results.violations
        .map(
          (v) =>
            `${v.id} (${v.impact}): ${v.help} → ${v.nodes
              .map((n) => n.target.join(" "))
              .slice(0, 3)
              .join(", ")}`,
        )
        .join("\n"),
    );
  }
}

async function fillCheckoutForm(page, overrides = {}) {
  const values = {
    Email: "jamie@example.com",
    "Full name": "Jamie Demo",
    Phone: "0803 000 0000",
    "Street address": "1 Example Close",
    "City or town": "Ikeja",
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByLabel("State", { exact: true }).selectOption("Lagos");
}

/** Goes from /checkout to the mock Paystack page and picks an outcome. Returns the reference. */
async function payWithMock(page, outcome) {
  await page.goto(`${BASE_URL}/checkout`, { waitUntil: "load" });
  await fillCheckoutForm(page);
  await page.getByRole("button", { name: "Pay with Paystack (test mode)" }).click();
  await page.waitForURL(/127\.0\.0\.1:4010\/pay\//, { timeout: 20_000 });
  const reference = page.url().split("/pay/")[1];
  await page.getByRole("link", { name: `Mock outcome: ${outcome}` }).click();
  return reference;
}

async function flows(browser) {
  // One visitor (one anonymous Firebase user) for the order flows.
  const { context, page, errors } = await openPage(browser, { cart: CART() });
  let firstReference;
  let secondReference;

  console.log("\nCheckout form (1280px)");
  await check(
    "shows every validation error and focuses the first invalid field",
    async () => {
      await page.goto(`${BASE_URL}/checkout`, { waitUntil: "load" });
      await expect(page.getByText("Test mode: no real money")).toBeVisible();
      await expect(page.getByRole("region", { name: "Order summary" })).toContainText(
        "₦43,275.00",
      );
      await page.getByRole("button", { name: "Pay with Paystack (test mode)" }).click();
      for (const message of [
        "Enter a valid email address",
        "Enter your full name.",
        "Enter a Nigerian mobile number",
        "Enter a street address.",
        "Enter a city or town.",
        "Choose a state.",
      ]) {
        await expect(page.getByText(message, { exact: false })).toBeVisible();
      }
      await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
      await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(page.url()).toBe(`${BASE_URL}/checkout`);
    },
  );

  await check("rejects a malformed phone number and email", async () => {
    await fillCheckoutForm(page, { Email: "jamie@", Phone: "12345" });
    await page.getByRole("button", { name: "Pay with Paystack (test mode)" }).click();
    await expect(
      page.getByText("Enter a valid email address", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("Enter a Nigerian mobile number", { exact: false }),
    ).toBeVisible();
    expect(page.url()).toBe(`${BASE_URL}/checkout`);
  });

  console.log("\nPaystack test payment via the local mock");
  await check(
    "successful payment is verified, saved under its reference and shown",
    async () => {
      firstReference = await payWithMock(page, "success");
      await page.waitForURL(`${BASE_URL}/orders/${firstReference}`, { timeout: 30_000 });
      await expect(page.getByText("Total paid")).toBeVisible();
      const main = page.getByRole("main");
      await expect(main).toContainText("₦43,275.00");
      await expect(main).toContainText("Colour: Sage · 2 × ₦18,500.00");
      await expect(main).toContainText(firstReference);
      await expect(main).toContainText("Jamie Demo");
      await expect(main).toContainText("1 Example Close, Ikeja, Lagos");
      await expect(page.locator("[aria-current=step]")).toContainText("Paid");
      await expect.poll(() => cartCount(page)).toBe(0);
    },
  );

  await check("visiting the callback again does not create a duplicate", async () => {
    await page.goto(
      `${BASE_URL}/checkout/callback?trxref=${firstReference}&reference=${firstReference}`,
      { waitUntil: "load" },
    );
    await expect(
      page.getByRole("heading", { name: "This order is already saved" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "All orders" }).click();
    await page.waitForURL(`${BASE_URL}/orders`);
    await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(1);
  });

  await check(
    "advance status walks paid → processing → shipped → delivered",
    async () => {
      await page.goto(`${BASE_URL}/orders/${firstReference}`, {
        waitUntil: "load",
      });
      const advance = page.getByRole("button", { name: "Advance status" });
      for (const status of ["Processing", "Shipped", "Delivered"]) {
        await advance.click();
        await expect(page.locator("[aria-current=step]")).toContainText(status);
        if (status === "Shipped") {
          await expect(page.getByRole("button", { name: "Cancel order" })).toHaveCount(0);
          await expect(
            page.getByText("Orders can only be cancelled before they ship."),
          ).toBeVisible();
        }
      }
      await expect(advance).toBeDisabled();
      // Persisted: reload and the status is still Delivered.
      await page.reload({ waitUntil: "load" });
      await expect(page.locator("[aria-current=step]")).toContainText("Delivered");
    },
  );

  await check("cancel order asks for confirmation, then cancels", async () => {
    await page.evaluate(
      (cart) => localStorage.setItem("kestrel-cart", cart),
      CART([{ productId: "prd_pourover_set", variantId: null, quantity: 1 }]),
    );
    secondReference = await payWithMock(page, "success");
    await page.waitForURL(`${BASE_URL}/orders/${secondReference}`, { timeout: 30_000 });
    await page.getByRole("button", { name: "Cancel order" }).click();
    await expect(
      page.getByText("Cancel this order? This can't be undone."),
    ).toBeFocused();
    await page.getByRole("button", { name: "Keep order" }).click();
    await page.getByRole("button", { name: "Cancel order" }).click();
    await page.getByRole("button", { name: "Yes, cancel order" }).click();
    await expect(page.getByText("This order was cancelled.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Advance status" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Cancel order" })).toHaveCount(0);
  });

  await check("orders list shows both orders with their statuses", async () => {
    await page.goto(`${BASE_URL}/orders`, { waitUntil: "load" });
    const items = page.getByRole("main").getByRole("listitem");
    await expect(items).toHaveCount(2);
    await expect(items.first()).toContainText("Cancelled");
    await expect(items.last()).toContainText("Delivered");
  });

  console.log("\nFailure states");
  await check("abandoned payment keeps the cart and offers Try again", async () => {
    await page.evaluate((cart) => localStorage.setItem("kestrel-cart", cart), CART());
    await payWithMock(page, "abandoned");
    await expect(
      page.getByRole("heading", { name: "Payment not completed" }),
    ).toBeVisible();
    await expect(page.getByText("You haven't been charged.")).toBeVisible();
    await expect.poll(() => cartCount(page)).toBe(2);
    await page.getByRole("link", { name: "Try again" }).click();
    await page.waitForURL(`${BASE_URL}/checkout`);
  });

  await check("failed payment is reported", async () => {
    await payWithMock(page, "failed");
    await expect(page.getByRole("heading", { name: "Payment failed" })).toBeVisible();
  });

  await check("a tampered amount is rejected and nothing is saved", async () => {
    const reference = await payWithMock(page, "tamper");
    await expect(
      page.getByRole("heading", { name: "We couldn't verify this payment" }),
    ).toBeVisible();
    await expect(page.getByText("doesn't match the order total")).toBeVisible();
    await page.goto(`${BASE_URL}/orders/${reference}`, { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: "Order not found" })).toBeVisible();
  });

  await check("the wrong currency is rejected", async () => {
    await payWithMock(page, "usd");
    await expect(
      page.getByRole("heading", { name: "We couldn't verify this payment" }),
    ).toBeVisible();
    await expect(page.getByText("wrong currency")).toBeVisible();
  });

  await check("a gateway error can be retried until the order saves", async () => {
    const reference = await payWithMock(page, "garbage");
    await expect(page.getByRole("heading", { name: "Network problem" })).toBeVisible();
    // Paystack recovers: the retry verifies and saves the order.
    await fetch(`${MOCK_URL}/__outcome/${reference}/success`, { method: "POST" });
    await page.getByRole("button", { name: "Try again" }).click();
    await page.waitForURL(`${BASE_URL}/orders/${reference}`, { timeout: 30_000 });
    await expect(page.getByText("Total paid")).toBeVisible();
  });

  await check("unknown, malformed and missing references show clear errors", async () => {
    const unknown = "kc-00000000000000000000000000000000";
    await page.goto(`${BASE_URL}/checkout/callback?reference=${unknown}`);
    await expect(
      page.getByText("Paystack has no transaction with this reference."),
    ).toBeVisible();
    await page.goto(`${BASE_URL}/checkout/callback?reference=../../etc`);
    await expect(
      page.getByText("doesn't contain a valid payment reference"),
    ).toBeVisible();
    await page.goto(`${BASE_URL}/checkout/callback`);
    await expect(page.getByText("none was found")).toBeVisible();
  });

  await check("no console errors in the order flows", async () => {
    if (errors.length) throw new Error(errors.join("\n"));
  });

  // Keep this visitor's anonymous session (IndexedDB) for the layout/axe matrix.
  const storageState = await context.storageState({ indexedDB: true });
  await context.close();
  return { storageState, orderId: firstReference };
}

async function matrix(browser, { storageState, orderId }) {
  const pages = [
    ["/checkout", "Checkout"],
    [
      "/checkout/callback?reference=kc-11111111111111111111111111111111",
      "Something went wrong",
    ],
    ["/orders", "Your orders"],
    [`/orders/${orderId}`, "Total paid"],
  ];
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      console.log(`\n${width}px · ${theme}`);
      const { context, page, errors } = await openPage(browser, {
        width,
        theme,
        storageState,
        cart: CART(),
      });
      for (const [path, marker] of pages) {
        await check(
          `${path.split("?")[0]}: renders, no overflow, no a11y violations`,
          async () => {
            errors.length = 0;
            await page.goto(BASE_URL + path, { waitUntil: "load" });
            await expect(page.getByText(marker).first()).toBeVisible();
            const isDark = await page.evaluate(() =>
              document.documentElement.classList.contains("dark"),
            );
            if (isDark !== (theme === "dark")) throw new Error(`Expected ${theme} theme`);
            await noHorizontalOverflow(page);
            await axe(page);
            if (errors.length > 0)
              throw new Error(`Console errors:\n${errors.join("\n")}`);
          },
        );
      }
      await check("/checkout with validation errors: no a11y violations", async () => {
        await page.goto(`${BASE_URL}/checkout`, { waitUntil: "load" });
        await page.getByRole("button", { name: "Pay with Paystack (test mode)" }).click();
        await expect(page.getByText("Choose a state.")).toBeVisible();
        await noHorizontalOverflow(page);
        await axe(page);
      });
      await context.close();
    }
  }
}

const mock = await startMockPaystack(MOCK_PORT);
const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  env: {
    ...process.env,
    PAYSTACK_SECRET_KEY: "sk_test_e2e_fake_key_not_real",
    PAYSTACK_API_BASE_URL: MOCK_URL,
  },
  stdio: ["ignore", "ignore", "inherit"],
  detached: true,
});

let browser;
try {
  await waitForServer(`${BASE_URL}/`);
  browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const state = await flows(browser);
  await matrix(browser, state);
} finally {
  await browser?.close();
  process.kill(-server.pid, "SIGTERM");
  mock.server.close();
}

console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length > 0 ? 1 : 0);
