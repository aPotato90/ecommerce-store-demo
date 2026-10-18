import { describe, expect, it } from "vitest";

import { formatPhone, shortReference } from "./format";

describe("order formatting", () => {
  it("shortens references for headings", () => {
    expect(shortReference("kc-0123456789abcdef0123456789abcdef")).toBe("kc-0123…cdef");
    expect(shortReference("short")).toBe("short");
  });

  it("formats Nigerian phone numbers for display", () => {
    expect(formatPhone("08030000000")).toBe("0803 000 0000");
    expect(formatPhone("+2348030000000")).toBe("+234 803 000 0000");
    expect(formatPhone("12345")).toBe("12345");
  });
});
