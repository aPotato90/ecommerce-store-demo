import { notFound } from "next/navigation";

/**
 * Target of the Proxy rewrite for unknown product slugs. Calling `notFound()` while
 * prerendering lets this route serve the not-found UI with a real 404 status, which a
 * streamed dynamic `/shop/[slug]` response cannot do.
 */
// This route exists only to render a 404, so instant-navigation validation does not apply.
export const instant = false;

export default function ProductNotFound() {
  notFound();
}
