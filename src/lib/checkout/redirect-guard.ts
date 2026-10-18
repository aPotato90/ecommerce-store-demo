/**
 * Watches a page that has started a full-page redirect to Paystack and tells the caller when
 * the visitor is evidently still (or again) on the page, so a "Redirecting…" state can't get
 * stuck:
 *
 * - `restored`: the page came back from the back/forward cache (`pageshow` with
 *   `persisted: true`). The browser froze the page mid-redirect, pending state and all.
 * - `visible`: the tab became visible again and the redirect still hasn't happened after
 *   `visibleGraceMs` (e.g. the visitor switched back from another tab).
 * - `timeout`: the page is still here `timeoutMs` after the redirect started.
 *
 * Framework-free so it can be unit tested with fake timers and fake event targets.
 */

export type RedirectGuardReason = "restored" | "visible" | "timeout";

type Listener = (event: Event) => void;
type MinimalTarget = {
  addEventListener(type: string, listener: Listener): void;
  removeEventListener(type: string, listener: Listener): void;
};

export type RedirectGuardOptions = {
  onReset: (reason: RedirectGuardReason) => void;
  timeoutMs?: number;
  visibleGraceMs?: number;
  win?: MinimalTarget;
  doc?: MinimalTarget & { visibilityState: DocumentVisibilityState };
};

export const REDIRECT_TIMEOUT_MS = 15_000;
export const VISIBLE_GRACE_MS = 3_000;

/** Starts watching; returns a cleanup function that removes every listener and timer. */
export function watchRedirect({
  onReset,
  timeoutMs = REDIRECT_TIMEOUT_MS,
  visibleGraceMs = VISIBLE_GRACE_MS,
  win = window,
  doc = document,
}: RedirectGuardOptions): () => void {
  let done = false;
  let graceTimer: ReturnType<typeof setTimeout> | undefined;

  const finish = (reason: RedirectGuardReason) => {
    if (done) return;
    cleanup();
    onReset(reason);
  };

  const timeoutTimer = setTimeout(() => finish("timeout"), timeoutMs);

  const onPageShow: Listener = (event) => {
    if ((event as PageTransitionEvent).persisted) finish("restored");
  };

  const onVisibilityChange: Listener = () => {
    clearTimeout(graceTimer);
    if (doc.visibilityState === "visible") {
      graceTimer = setTimeout(() => finish("visible"), visibleGraceMs);
    }
  };

  function cleanup() {
    done = true;
    clearTimeout(timeoutTimer);
    clearTimeout(graceTimer);
    win.removeEventListener("pageshow", onPageShow);
    doc.removeEventListener("visibilitychange", onVisibilityChange);
  }

  win.addEventListener("pageshow", onPageShow);
  doc.addEventListener("visibilitychange", onVisibilityChange);
  return cleanup;
}
