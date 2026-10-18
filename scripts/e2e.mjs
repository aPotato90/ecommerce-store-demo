// Browser QA for the storefront: functional flows, layout overflow, console errors and an
// axe-core accessibility audit at 375 / 768 / 1280 px in light and dark themes.
//
// Usage: build and start the app (npm run build && npm start), then
//   BASE_URL=http://localhost:3000 npm run test:e2e
// Set CHROMIUM_PATH to use a pre-installed Chromium instead of `npx playwright install`.

import AxeBuilder from "@axe-core/playwright";
import { chromium, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const WIDTHS = [375, 768, 1280];
const THEMES = ["light", "dark"];
const PAGES = ["/", "/shop", "/shop/aster-ceramic-vase", "/cart", "/orders"];
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
        .slice(0, 6)
        .join("\n    ")}`,
    );
  }
}

async function launch() {
  try {
    return await chromium.launch(
      process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
    );
  } catch (error) {
    console.error(
      "Could not launch Chromium. Run `npx playwright install chromium` or set CHROMIUM_PATH.",
    );
    throw error;
  }
}

/** Opens a context that records console errors and uncaught exceptions. */
async function openPage(browser, { width, theme, initScript }) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: theme,
    reducedMotion: "reduce",
  });
  if (initScript) await context.addInitScript(initScript);
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return { context, page, errors };
}

// Pages stay mounted (hidden) after client navigations, so always target visible elements.
const visible = (locator) => locator.filter({ visible: true });

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
  if (scrollWidth > innerWidth)
    throw new Error(`Horizontal overflow: ${scrollWidth}px > ${innerWidth}px`);
}

async function auditMatrix(browser) {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      console.log(`\n${width}px · ${theme}`);
      const { context, page, errors } = await openPage(browser, { width, theme });
      for (const path of PAGES) {
        await check(
          `${path}: renders, ${theme} theme applied, no overflow, no a11y violations`,
          async () => {
            errors.length = 0;
            const response = await page.goto(BASE_URL + path, {
              waitUntil: "networkidle",
            });
            if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);
            const isDark = await page.evaluate(() =>
              document.documentElement.classList.contains("dark"),
            );
            if (isDark !== (theme === "dark")) throw new Error(`Expected ${theme} theme`);
            await expect(
              page.getByText("Demo store. No real orders. Paystack test mode."),
            ).toBeVisible();
            await expect(page.getByText(/Kestrel & Co\. is fictional/)).toBeVisible();
            await noHorizontalOverflow(page);
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
            if (errors.length > 0)
              throw new Error(`Console errors:\n${errors.join("\n")}`);
          },
        );
      }
      await context.close();
    }
  }
}

async function functionalFlows(browser) {
  console.log("\nShop: search, filters, sort and URL state (1280px)");
  {
    const { context, page, errors } = await openPage(browser, {
      width: 1280,
      theme: "light",
    });
    await page.goto(`${BASE_URL}/shop`, { waitUntil: "networkidle" });

    await check("search updates the URL and results", async () => {
      await page.getByLabel("Search", { exact: true }).fill("coffee");
      await page.waitForURL(/q=coffee/);
      await expect(
        page.getByRole("status").filter({ hasText: "for “coffee”" }),
      ).toBeVisible();
      await expect(
        visible(page.getByRole("list", { name: "Products" }).getByRole("listitem")),
      ).toHaveCount(3);
    });

    await check("category filter is reflected in the URL and aria-pressed", async () => {
      await page.getByRole("button", { name: "Kitchen", exact: true }).click();
      await page.waitForURL(/category=kitchen/);
      await expect(
        page.getByRole("button", { name: "Kitchen", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(new URL(page.url()).searchParams.get("q")).toBe("coffee");
    });

    await check("sort select updates the URL and order", async () => {
      await page.goto(`${BASE_URL}/shop`, { waitUntil: "networkidle" });
      await page.getByRole("combobox", { name: "Sort by" }).click();
      await page.getByRole("option", { name: "Price: low to high" }).click();
      await page.waitForURL(/sort=price-asc/);
      const prices = await visible(
        page.getByRole("list", { name: "Products" }).locator("article"),
      ).evaluateAll((cards) =>
        cards.map((c) =>
          Number(c.textContent.match(/₦([\d,]+\.\d\d)/)[1].replaceAll(",", "")),
        ),
      );
      if (prices.join() !== [...prices].sort((a, b) => a - b).join())
        throw new Error(`Not sorted: ${prices}`);
    });

    await check("deep link restores filters from the URL", async () => {
      await page.goto(`${BASE_URL}/shop?category=desk&sort=price-desc&max=100000`, {
        waitUntil: "networkidle",
      });
      await expect(page.getByRole("status").filter({ hasText: "in Desk" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Desk", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("combobox", { name: "Sort by" })).toHaveText(
        /Price: high to low/,
      );
      await expect(page.getByRole("slider", { name: "Maximum price" })).toHaveAttribute(
        "aria-valuenow",
        "100000",
      );
    });

    await check("load more reveals the next page and moves focus", async () => {
      await page.goto(`${BASE_URL}/shop`, { waitUntil: "networkidle" });
      const items = visible(
        page.getByRole("list", { name: "Products" }).getByRole("listitem"),
      );
      await expect(items).toHaveCount(8);
      await page.getByRole("button", { name: /Load more/ }).click();
      await page.waitForURL(/page=2/);
      await expect(items).toHaveCount(16);
      const focused = await page.evaluate(
        () => document.activeElement?.closest("li") !== null,
      );
      if (!focused) throw new Error("Focus did not move to the new results");
    });

    await check("empty state offers a reset", async () => {
      await page.goto(`${BASE_URL}/shop?q=zzzz`, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Nothing found" })).toBeVisible();
      await page.getByRole("button", { name: "Clear all filters" }).click();
      await page.waitForURL(`${BASE_URL}/shop`);
      await expect(
        visible(page.getByRole("list", { name: "Products" }).getByRole("listitem")),
      ).toHaveCount(8);
    });

    await check("header search navigates to /shop?q=", async () => {
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      const search = page.getByRole("searchbox", { name: "Search products" });
      await search.fill("lantern");
      await search.press("Enter");
      await page.waitForURL(/\/shop\?q=lantern/);
      await expect(
        page.getByRole("heading", { name: "Harbor Rechargeable Lantern" }),
      ).toBeVisible();
    });

    await check("no console errors during shop flows", async () => {
      if (errors.length) throw new Error(errors.join("\n"));
    });
    await context.close();
  }

  console.log("\nCart: add, persist, update, remove + undo, stock limits (375px dark)");
  {
    const { context, page, errors } = await openPage(browser, {
      width: 375,
      theme: "dark",
    });
    await page.goto(`${BASE_URL}/shop/aster-ceramic-vase`, { waitUntil: "networkidle" });

    await check("add to cart with a variant and quantity updates the badge", async () => {
      await page.getByText("Sage", { exact: true }).click();
      await expect(page.getByRole("img", { name: /in Sage/ })).toBeVisible();
      await page
        .getByRole("button", { name: "Increase quantity of Aster Ceramic Vase" })
        .click();
      await page.getByRole("button", { name: "Add to cart" }).click();
      await expect(page.getByText(/Added 2 × Aster Ceramic Vase \(Sage\)/)).toBeVisible();
      await expect.poll(() => cartCount(page)).toBe(2);
      await expect(
        page
          .locator(".sr-only[role=status]")
          .filter({ hasText: "Cart updated: 2 items." }),
      ).toHaveCount(1);
    });

    await check("cart persists after reload", async () => {
      await page.reload({ waitUntil: "networkidle" });
      await expect.poll(() => cartCount(page)).toBe(2);
    });

    await check("cart drawer opens with the line and totals", async () => {
      await page.getByRole("button", { name: /^Open cart/ }).click();
      const drawer = page.getByRole("dialog", { name: "Your cart" });
      await expect(
        drawer.getByRole("link", { name: "Aster Ceramic Vase" }),
      ).toBeVisible();
      await expect(drawer.getByText("Colour: Sage")).toBeVisible();
      await expect(drawer.getByText("₦37,000.00").first()).toBeVisible();
      await drawer.getByRole("link", { name: "View cart and checkout" }).click();
      await page.waitForURL(/\/cart$/);
      await expect(drawer).toBeHidden();
    });

    await check(
      "/cart totals use priceCart (₦3,500 shipping under ₦75,000, 7.5% VAT)",
      async () => {
        const summary = page.getByRole("region", { name: "Order summary" });
        await expect(summary.getByText("₦3,500.00")).toBeVisible();
        await expect(summary.getByText("₦2,775.00")).toBeVisible(); // 7.5% of ₦37,000
        await expect(summary.getByText("₦43,275.00")).toBeVisible();
        await expect(summary.getByRole("button", { name: "Checkout" })).toBeDisabled();
        await expect(summary.getByText(/Checkout coming next/)).toBeVisible();
      },
    );

    await check("quantity can be changed on /cart", async () => {
      await page
        .getByRole("button", { name: "Decrease quantity of Aster Ceramic Vase" })
        .click();
      await expect.poll(() => cartCount(page)).toBe(1);
      await expect(
        page.getByText("Add ₦56,500.00 more for free shipping."),
      ).toBeVisible();
    });

    await check("remove shows an undo toast that restores the line", async () => {
      await page.getByRole("button", { name: "Remove Aster Ceramic Vase" }).click();
      await expect(
        page.getByRole("heading", { name: "Your cart is empty" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Undo" }).click();
      await expect(page.getByRole("link", { name: "Aster Ceramic Vase" })).toBeVisible();
      await expect.poll(() => cartCount(page)).toBe(1);
    });

    await check("stock limits are respected", async () => {
      await page.goto(`${BASE_URL}/shop/halden-table-lamp`, { waitUntil: "networkidle" });
      const increase = page.getByRole("button", {
        name: "Increase quantity of Halden Table Lamp",
      });
      await increase.click();
      await increase.click();
      await expect(increase).toBeDisabled();
      await page.getByRole("button", { name: "Add to cart" }).click();
      await expect.poll(() => cartCount(page)).toBe(4);
      await page.getByRole("button", { name: "Add to cart" }).click();
      await expect(page.getByText(/already have the maximum of 3/)).toBeVisible();
      await expect.poll(() => cartCount(page)).toBe(4);
    });

    await check("sold-out products cannot be added", async () => {
      await page.goto(`${BASE_URL}/shop/copper-stovetop-kettle`, {
        waitUntil: "networkidle",
      });
      await expect(page.getByRole("button", { name: "Sold out" })).toBeDisabled();
    });

    await check("mobile menu opens, navigates and closes", async () => {
      await page.getByRole("button", { name: "Open menu" }).click();
      const menu = page.getByRole("dialog", { name: "Kestrel & Co." });
      await menu.getByRole("link", { name: "Kitchen" }).click();
      await page.waitForURL(/category=kitchen/);
      await expect(menu).toBeHidden();
      await noHorizontalOverflow(page);
    });

    await check("no console errors during cart flows", async () => {
      if (errors.length) throw new Error(errors.join("\n"));
    });
    await context.close();
  }

  console.log("\nResilience, theming and keyboard");
  await check("tampered cart data is discarded without errors", async () => {
    const { context, page, errors } = await openPage(browser, {
      width: 768,
      theme: "light",
      initScript: () => {
        if (!sessionStorage.getItem("seeded")) {
          sessionStorage.setItem("seeded", "1");
          localStorage.setItem(
            "kestrel-cart",
            '{"version":1,"items":[{"productId":"x","quantity":-5}]}',
          );
        }
      },
    });
    await page.goto(`${BASE_URL}/cart`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
    if (errors.length) throw new Error(errors.join("\n"));
    await context.close();
  });

  await check("store works when localStorage is blocked", async () => {
    const { context, page, errors } = await openPage(browser, {
      width: 768,
      theme: "light",
      initScript: () => {
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new DOMException("Blocked", "SecurityError");
          },
        });
      },
    });
    await page.goto(`${BASE_URL}/shop/trail-insulated-bottle`, {
      waitUntil: "networkidle",
    });
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect.poll(() => cartCount(page)).toBe(1);
    if (errors.length) throw new Error(errors.join("\n"));
    await context.close();
  });

  await check(
    "saved theme is applied before first paint and toggle persists",
    async () => {
      const { context, page } = await openPage(browser, { width: 1280, theme: "light" });
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Change colour theme" }).click();
      await page.getByRole("menuitemradio", { name: "Dark" }).click();
      expect(
        await page.evaluate(() => document.documentElement.classList.contains("dark")),
      ).toBe(true);
      // Check the class straight after the HTML is parsed, before hydration.
      await page.goto(BASE_URL, { waitUntil: "commit" });
      await page.waitForFunction(() => document.body !== null);
      expect(
        await page.evaluate(() => document.documentElement.classList.contains("dark")),
      ).toBe(true);
      await context.close();
    },
  );

  await check("mobile filters toggle at 768px", async () => {
    const { context, page } = await openPage(browser, { width: 768, theme: "dark" });
    await page.goto(`${BASE_URL}/shop`, { waitUntil: "networkidle" });
    const toggle = page.getByRole("button", { name: /^Filters/ });
    await expect(page.getByRole("complementary", { name: "Filters" })).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("button", { name: "Outdoor", exact: true }).click();
    await page.waitForURL(/category=outdoor/);
    await expect(toggle).toContainText("1 active");
    await noHorizontalOverflow(page);
    await context.close();
  });

  await check(
    "keyboard: first Tab reaches the skip link, which moves focus to main",
    async () => {
      const { context, page } = await openPage(browser, { width: 1280, theme: "light" });
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
      await page.keyboard.press("Enter");
      expect(await page.evaluate(() => document.activeElement?.id)).toBe("main");
      await context.close();
    },
  );

  await check("unknown product slugs return a 404 with the not-found page", async () => {
    const { context, page } = await openPage(browser, { width: 1280, theme: "light" });
    const response = await page.goto(`${BASE_URL}/shop/not-a-real-product`);
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: /couldn't find that page/ }),
    ).toBeVisible();
    await context.close();
  });

  await check("product pages have unique titles and descriptions", async () => {
    const { context, page } = await openPage(browser, { width: 1280, theme: "light" });
    await page.goto(`${BASE_URL}/shop/ember-soy-candle`);
    await expect(page).toHaveTitle("Ember Soy Candle | Kestrel & Co.");
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    if (!description?.includes("Cedar, smoked vanilla"))
      throw new Error(`Bad description: ${description}`);
    await context.close();
  });
}

const browser = await launch();
try {
  await functionalFlows(browser);
  await auditMatrix(browser);
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) process.exit(1);
