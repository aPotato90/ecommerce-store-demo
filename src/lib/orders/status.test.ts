import { describe, expect, it } from "vitest";

import { canCancel, isAllowedTransition, nextStatus, ORDER_STATUSES } from "./status";

describe("order status lifecycle", () => {
  it("advances paid → processing → shipped → delivered and then stops", () => {
    expect(nextStatus("paid")).toBe("processing");
    expect(nextStatus("processing")).toBe("shipped");
    expect(nextStatus("shipped")).toBe("delivered");
    expect(nextStatus("delivered")).toBeNull();
    expect(nextStatus("cancelled")).toBeNull();
  });

  it("only cancels paid or processing orders", () => {
    expect(ORDER_STATUSES.filter(canCancel)).toEqual(["paid", "processing"]);
  });

  it("allows exactly the transitions firestore.rules allows", () => {
    const allowed = ORDER_STATUSES.flatMap((from) =>
      ORDER_STATUSES.filter((to) => isAllowedTransition(from, to)).map(
        (to) => `${from}->${to}`,
      ),
    );
    expect(allowed).toEqual([
      "paid->processing",
      "paid->cancelled",
      "processing->shipped",
      "processing->cancelled",
      "shipped->delivered",
    ]);
  });
});
