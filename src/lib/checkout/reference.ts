/**
 * Transaction references look like "kc-" + 32 hex chars (128 random bits). That is unguessable,
 * within Paystack's allowed charset (-, ., = and alphanumerics) and doubles as the Firestore
 * order id, so a reference can only ever be saved once.
 */
export const REFERENCE_PATTERN = /^kc-[0-9a-f]{32}$/;

export function generateReference(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return `kc-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function isValidReference(value: unknown): value is string {
  return typeof value === "string" && REFERENCE_PATTERN.test(value);
}
