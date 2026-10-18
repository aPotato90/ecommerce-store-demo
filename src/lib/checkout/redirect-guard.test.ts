import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REDIRECT_TIMEOUT_MS, VISIBLE_GRACE_MS, watchRedirect } from "./redirect-guard";

function pageShow(persisted: boolean) {
  return Object.assign(new Event("pageshow"), { persisted });
}

function setup() {
  const win = new EventTarget();
  const doc = Object.assign(new EventTarget(), {
    visibilityState: "visible" as DocumentVisibilityState,
  });
  const onReset = vi.fn();
  const cleanup = watchRedirect({ onReset, win, doc });
  const setVisibility = (state: DocumentVisibilityState) => {
    doc.visibilityState = state;
    doc.dispatchEvent(new Event("visibilitychange"));
  };
  return { win, doc, onReset, cleanup, setVisibility };
}

describe("watchRedirect", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("resets when the page is restored from the back/forward cache", () => {
    const { win, onReset } = setup();
    win.dispatchEvent(pageShow(true));
    expect(onReset).toHaveBeenCalledExactlyOnceWith("restored");
  });

  it("ignores a normal (non-persisted) pageshow", () => {
    const { win, onReset } = setup();
    win.dispatchEvent(pageShow(false));
    expect(onReset).not.toHaveBeenCalled();
  });

  it("resets when the tab is visible again and the redirect still hasn't happened", () => {
    const { onReset, setVisibility } = setup();
    setVisibility("hidden");
    setVisibility("visible");
    vi.advanceTimersByTime(VISIBLE_GRACE_MS - 1);
    expect(onReset).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onReset).toHaveBeenCalledExactlyOnceWith("visible");
  });

  it("does not reset if the tab is hidden again during the grace period", () => {
    const { onReset, setVisibility } = setup();
    setVisibility("visible");
    vi.advanceTimersByTime(VISIBLE_GRACE_MS - 500);
    setVisibility("hidden");
    vi.advanceTimersByTime(VISIBLE_GRACE_MS);
    expect(onReset).not.toHaveBeenCalled();
  });

  it("times out after 15 seconds if the redirect never leaves the page", () => {
    const { onReset } = setup();
    expect(REDIRECT_TIMEOUT_MS).toBe(15_000);
    vi.advanceTimersByTime(14_999);
    expect(onReset).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onReset).toHaveBeenCalledExactlyOnceWith("timeout");
  });

  it("fires at most once, then stops listening", () => {
    const { win, onReset, setVisibility } = setup();
    win.dispatchEvent(pageShow(true));
    win.dispatchEvent(pageShow(true));
    setVisibility("visible");
    vi.advanceTimersByTime(REDIRECT_TIMEOUT_MS * 2);
    expect(onReset).toHaveBeenCalledExactlyOnceWith("restored");
  });

  it("removes every listener and timer on cleanup (unmount)", () => {
    const { win, onReset, cleanup, setVisibility } = setup();
    cleanup();
    win.dispatchEvent(pageShow(true));
    setVisibility("visible");
    vi.advanceTimersByTime(REDIRECT_TIMEOUT_MS * 2);
    expect(onReset).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
