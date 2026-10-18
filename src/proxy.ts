import { NextResponse, type NextRequest } from "next/server";

import { products } from "@/data/products";

const knownSlugs = new Set(products.map((product) => product.slug));

export const config = {
  matcher: "/shop/:slug",
};

/** Unknown product slugs get a real 404 status instead of a streamed soft 404. */
export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2] ?? "";
  if (!knownSlugs.has(decodeURIComponent(slug))) {
    return NextResponse.rewrite(new URL("/product-not-found", request.url));
  }
  return NextResponse.next();
}
