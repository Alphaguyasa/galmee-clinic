import { describe, expect, it } from "vitest";
import { pickIncomeDay, shiftDay, summarizeIncome } from "./income";

describe("summarizeIncome", () => {
  it("adds up by service and leaves reversed lines out", () => {
    const r = summarizeIncome([
      {
        paidTotal: 250,
        debtPosted: 0,
        lines: [
          { serviceId: "c", serviceName: "Consultation", kind: "consultation", lineTotal: 150, reversed: false },
          { serviceId: "m", serviceName: "Malaria film", kind: "lab", lineTotal: 100, reversed: false },
          { serviceId: "m", serviceName: "Malaria film", kind: "lab", lineTotal: 100, reversed: true },
        ],
      },
      {
        paidTotal: 75,
        debtPosted: 75,
        lines: [{ serviceId: "c", serviceName: "Consultation", kind: "consultation", lineTotal: 150, reversed: false }],
      },
    ]);
    expect(r).toEqual({
      visits: 2,
      billed: 400,
      paid: 325,
      credit: 75,
      services: [
        { serviceId: "c", serviceName: "Consultation", kind: "consultation", count: 2, total: 300 },
        { serviceId: "m", serviceName: "Malaria film", kind: "lab", count: 1, total: 100 },
      ],
    });
  });

  it("is empty for a day without closed visits", () => {
    expect(summarizeIncome([])).toEqual({ visits: 0, billed: 0, paid: 0, credit: 0, services: [] });
  });
});

describe("pickIncomeDay", () => {
  it("keeps a valid past day", () => expect(pickIncomeDay("2026-11-10", "2026-11-17")).toBe("2026-11-10"));
  it("falls back to today for junk, impossible dates and the future", () => {
    expect(pickIncomeDay(undefined, "2026-11-17")).toBe("2026-11-17");
    expect(pickIncomeDay("x' or 1=1", "2026-11-17")).toBe("2026-11-17");
    expect(pickIncomeDay("2026-02-30", "2026-11-17")).toBe("2026-11-17");
    expect(pickIncomeDay("2026-12-01", "2026-11-17")).toBe("2026-11-17");
  });
  it("shifts across month ends", () => {
    expect(shiftDay("2026-11-30", 1)).toBe("2026-12-01");
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
  });
});
