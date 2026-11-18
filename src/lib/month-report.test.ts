import { describe, expect, it } from "vitest";
import {
  csvCell,
  formatMonthParam,
  monthLength,
  monthlyIncomeCsv,
  monthOf,
  monthRange,
  pickMonth,
  shiftMonth,
  summarizeByDay,
} from "./month-report";

describe("Ethiopian months", () => {
  it("finds the month of a day", () => {
    expect(monthOf("2026-11-18")).toEqual({ year: 2019, month: 3 });
    expect(monthOf("2026-09-11")).toEqual({ year: 2019, month: 1 });
  });

  it("gives the Gregorian range of a month", () => {
    expect(monthRange({ year: 2019, month: 3 })).toEqual({ from: "2026-11-10", to: "2026-12-10" });
    expect(monthRange({ year: 2018, month: 13 })).toEqual({ from: "2026-09-06", to: "2026-09-11" });
  });

  it("knows Pagume's length", () => {
    expect(monthLength({ year: 2018, month: 13 })).toBe(5);
    expect(monthLength({ year: 2019, month: 13 })).toBe(6);
    expect(monthLength({ year: 2019, month: 4 })).toBe(30);
  });

  it("moves across Pagume and the new year", () => {
    expect(shiftMonth({ year: 2018, month: 13 }, 1)).toEqual({ year: 2019, month: 1 });
    expect(shiftMonth({ year: 2019, month: 1 }, -1)).toEqual({ year: 2018, month: 13 });
    expect(shiftMonth({ year: 2019, month: 3 }, -1)).toEqual({ year: 2019, month: 2 });
  });

  it("reads the month parameter safely", () => {
    const today = "2026-11-18";
    expect(pickMonth(undefined, today)).toEqual({ year: 2019, month: 3 });
    expect(pickMonth("2019-01", today)).toEqual({ year: 2019, month: 1 });
    expect(pickMonth("2019-04", today)).toEqual({ year: 2019, month: 3 });
    expect(pickMonth("2020-01", today)).toEqual({ year: 2019, month: 3 });
    expect(pickMonth("2019-14", today)).toEqual({ year: 2019, month: 3 });
    expect(pickMonth("x';--", today)).toEqual({ year: 2019, month: 3 });
    expect(formatMonthParam({ year: 2018, month: 13 })).toBe("2018-13");
  });
});

describe("monthly income", () => {
  it("adds up visits per day, oldest first", () => {
    const days = summarizeByDay([
      { day: "2026-11-12", paidTotal: 300, debtPosted: 0, billed: 300 },
      { day: "2026-11-10", paidTotal: 100, debtPosted: 50.1, billed: 150.1 },
      { day: "2026-11-12", paidTotal: 0.2, debtPosted: 0, billed: 0.2 },
    ]);
    expect(days).toEqual([
      { day: "2026-11-10", visits: 1, billed: 150.1, paid: 100, credit: 50.1 },
      { day: "2026-11-12", visits: 2, billed: 300.2, paid: 300.2, credit: 0 },
    ]);
  });

  it("escapes CSV cells and blocks formulas", () => {
    expect(csvCell("Consultation")).toBe("Consultation");
    expect(csvCell('X-ray, "chest"')).toBe('"X-ray, ""chest"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(1234.5)).toBe("1234.50");
    expect(csvCell(-3)).toBe("-3.00");
  });

  it("writes totals, services and days", () => {
    const csv = monthlyIncomeCsv(
      {
        visits: 2,
        billed: 450,
        paid: 400,
        credit: 50,
        services: [{ serviceId: "s1", serviceName: "CBC", kind: "lab", count: 1, total: 400 }],
        days: [{ day: "2026-11-10", visits: 2, billed: 450, paid: 400, credit: 50 }],
      },
      {
        section: { services: "By service", days: "By day", totals: "Totals" },
        columns: { service: "Service", kind: "Kind", count: "Times", total: "Total", day: "Date", dayEth: "Date (E.C.)", visits: "Visits", billed: "Billed", paid: "Paid", credit: "Credit" },
      },
      (k) => (k === "lab" ? "Lab test" : k),
      () => "Hidar 1, 2019",
    );
    expect(csv.startsWith("﻿Totals\r\n")).toBe(true);
    expect(csv).toContain("2,450.00,400.00,50.00\r\n");
    expect(csv).toContain("CBC,Lab test,1,400.00\r\n");
    expect(csv).toContain('2026-11-10,"Hidar 1, 2019",2,450.00,400.00,50.00\r\n');
  });
});
