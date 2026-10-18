"use client";

/**
 * Runs an inline script during HTML parsing (before first paint) without React's
 * "script tag while rendering" warning: the server emits an executable script and the
 * client renders an inert text/plain copy. See the Next.js "Preventing flash" guide.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
