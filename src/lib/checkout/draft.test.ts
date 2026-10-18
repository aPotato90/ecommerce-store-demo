import { describe, expect, it } from "vitest";

import {
  CHECKOUT_DRAFT_KEY,
  clearCheckoutDraft,
  readCheckoutDraft,
  writeCheckoutDraft,
} from "./draft";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const blocked = {
  getItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
  removeItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
};

const values = {
  email: "ada@example.com",
  fullName: "Ada Demo",
  phone: "0803 000 0000",
  addressLine1: "12 Example Crescent",
  addressLine2: "",
  city: "Ikeja",
  state: "Lagos" as const,
};

describe("checkout draft", () => {
  it("round-trips the form values", () => {
    const storage = memoryStorage();
    writeCheckoutDraft(values, storage);
    expect(readCheckoutDraft(storage)).toEqual(values);
    clearCheckoutDraft(storage);
    expect(readCheckoutDraft(storage)).toBeNull();
  });

  it("ignores missing, malformed or tampered drafts", () => {
    expect(readCheckoutDraft(memoryStorage())).toBeNull();
    expect(
      readCheckoutDraft(memoryStorage({ [CHECKOUT_DRAFT_KEY]: "{oops" })),
    ).toBeNull();
    const tampered = readCheckoutDraft(
      memoryStorage({
        [CHECKOUT_DRAFT_KEY]: JSON.stringify({
          ...values,
          fullName: 42,
          city: "x".repeat(500),
        }),
      }),
    );
    expect(tampered).toMatchObject({ email: values.email, fullName: "", city: "" });
  });

  it("does nothing (and doesn't throw) when storage is blocked", () => {
    expect(() => writeCheckoutDraft(values, blocked)).not.toThrow();
    expect(readCheckoutDraft(blocked)).toBeNull();
    expect(() => clearCheckoutDraft(blocked)).not.toThrow();
  });
});
