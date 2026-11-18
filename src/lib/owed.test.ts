import { describe, expect, it } from "vitest";
import { mergeOwed } from "./owed";

const patient = (id: string, customer: string, cardNo: number) => ({ id, card_no: cardNo, full_name: `P ${id}`, phone: null, customer_id: customer });

describe("mergeOwed", () => {
  it("keeps the oldest-debt order and joins by customer", () => {
    const rows = mergeOwed(
      [
        { customer_id: "c2", balance: "120.505", oldest_debt_at: "2026-10-01T08:00:00Z" },
        { customer_id: "c1", balance: 40, oldest_debt_at: "2026-11-01T08:00:00Z" },
      ],
      [patient("p1", "c1", 7), patient("p2", "c2", 9)],
    );
    expect(rows.map((r) => [r.patientId, r.cardNo, r.balance])).toEqual([
      ["p2", 9, 120.51],
      ["p1", 7, 40],
    ]);
  });

  it("drops non-patients, nulls and zero balances", () => {
    const rows = mergeOwed(
      [
        { customer_id: "other", balance: 50, oldest_debt_at: null },
        { customer_id: null, balance: 10, oldest_debt_at: null },
        { customer_id: "c1", balance: 0, oldest_debt_at: null },
        { customer_id: "c2", balance: null, oldest_debt_at: null },
      ],
      [patient("p1", "c1", 1), patient("p2", "c2", 2)],
    );
    expect(rows).toEqual([]);
  });
});
