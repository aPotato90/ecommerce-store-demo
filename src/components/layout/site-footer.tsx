import Link from "next/link";

import { mainNav, siteConfig } from "@/lib/site";

import { KestrelMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div className="space-y-3">
          <p className="flex items-center gap-2 font-heading text-lg font-semibold">
            <KestrelMark className="size-6" /> {siteConfig.name}
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Thoughtfully made goods for home, kitchen, desk and the outdoors. A fictional
            brand for a portfolio project.
          </p>
        </div>
        <nav aria-label="Footer">
          <h2 className="mb-3 font-sans text-sm font-semibold">Shop</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/orders"
                className="rounded-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                Your orders
              </Link>
            </li>
            <li>
              <Link
                href="/cart"
                className="rounded-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                Cart
              </Link>
            </li>
          </ul>
        </nav>
        <div className="space-y-2 text-sm">
          <h2 className="font-sans text-sm font-semibold">About this demo</h2>
          <p className="text-muted-foreground">
            Questions? Write to{" "}
            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className="rounded-sm underline underline-offset-4 hover:text-foreground"
            >
              {siteConfig.supportEmail}
            </a>{" "}
            (not monitored).
          </p>
          <p className="text-muted-foreground">
            Built by{" "}
            <a
              href={siteConfig.portfolioUrl}
              className="rounded-sm font-medium text-foreground underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              {siteConfig.author}
              <span className="sr-only"> (portfolio, opens in a new tab)</span>
            </a>
          </p>
        </div>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          <strong className="font-semibold text-foreground">
            {siteConfig.disclaimer}
          </strong>{" "}
          Brand, products and reviews are fictional. &copy; {siteConfig.name}
        </p>
      </div>
    </footer>
  );
}
