import { describe, expect, it } from "vitest";
import { statementLines } from "./statement";

describe("statementLines", () => {
  it("keeps a running balance and ignores unknown row types", () => {
    const r = statementLines([
      { type: "debt", amount: "185.00", created_at: "a" },
      { type: "repayment", amount: 100, created_at: "b" },
      { type: "adjustment", amount: 999, created_at: "c" },
      { type: "debt", amount: 40.1, created_at: "d" },
    ]);
    expect(r.balance).toBe(125.1);
    expect(r.lines.map((l) => l.balanceAfter)).toEqual([185, 85, 125.1]);
  });
  it("is zero with no rows", () => expect(statementLines([])).toEqual({ lines: [], balance: 0 }));
});
