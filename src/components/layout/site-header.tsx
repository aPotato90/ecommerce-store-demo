import Link from "next/link";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { mainNav } from "@/lib/site";

import { CartButton } from "./cart-button";
import { HeaderSearch } from "./header-search";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        <MobileNav />
        <Logo />
        <nav aria-label="Main" className="ml-6 hidden md:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <HeaderSearch
            id="header-search"
            className="mr-1 hidden w-56 lg:block xl:w-64"
          />
          <Button asChild variant="ghost" size="icon-lg" className="lg:hidden">
            <Link href="/shop#shop-search" aria-label="Search products">
              <SearchIcon aria-hidden="true" />
            </Link>
          </Button>
          <ThemeToggle />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
