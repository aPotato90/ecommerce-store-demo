"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { mainNav, siteConfig } from "@/lib/site";

import { HeaderSearch } from "./header-search";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="md:hidden"
          aria-label="Open menu"
        >
          <MenuIcon aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85%] max-w-xs">
        <SheetHeader className="border-b">
          <SheetTitle className="font-heading text-lg">{siteConfig.name}</SheetTitle>
          <SheetDescription>Browse the demo catalogue.</SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <HeaderSearch id="mobile-search" onSubmit={close} />
        </div>
        <nav aria-label="Mobile">
          <ul className="flex flex-col px-2">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  className="flex rounded-md px-3 py-3 text-base font-medium hover:bg-muted"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/orders"
                onClick={close}
                className="flex rounded-md px-3 py-3 text-base font-medium hover:bg-muted"
              >
                Your orders
              </Link>
            </li>
            <li>
              <Link
                href="/cart"
                onClick={close}
                className="flex rounded-md px-3 py-3 text-base font-medium hover:bg-muted"
              >
                Cart
              </Link>
            </li>
          </ul>
        </nav>
        <p className="mt-auto p-4 text-xs text-muted-foreground">
          {siteConfig.disclaimer}
        </p>
      </SheetContent>
    </Sheet>
  );
}
