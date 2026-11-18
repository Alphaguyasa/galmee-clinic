import { isEthiopianLeapYear, parseGregorian, toEthiopian, toGregorian, type GregorianDate } from "@/lib/ethiopian-date";
import type { DailyIncome } from "@/lib/income";

/** An Ethiopian calendar month: month 1 is Meskerem, 13 is Pagume. */
export type EthMonth = { year: number; month: number };

export type IncomeDayRow = { day: string; visits: number; billed: number; paid: number; credit: number };

export type MonthlyIncome = DailyIncome & { days: IncomeDayRow[] };

const iso = (g: GregorianDate) =>
  `${g.year}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`;

/** Number of days in an Ethiopian month (30, or 5/6 for Pagume). */
export function monthLength({ year, month }: EthMonth): number {
  if (month < 13) return 30;
  return isEthiopianLeapYear(year) ? 6 : 5;
}

/** The month after (by = 1) or before (by = -1) this one, across years. */
export function shiftMonth({ year, month }: EthMonth, by: number): EthMonth {
  const index = year * 13 + (month - 1) + by;
  return { year: Math.floor(index / 13), month: (index % 13) + 1 };
}

/** First Gregorian day of the month and first day of the next month (exclusive), as YYYY-MM-DD. */
export function monthRange(m: EthMonth): { from: string; to: string } {
  return {
    from: iso(toGregorian({ ...m, day: 1 })),
    to: iso(toGregorian({ ...shiftMonth(m, 1), day: 1 })),
  };
}

/** The Ethiopian month a YYYY-MM-DD Gregorian day falls in. */
export function monthOf(day: string): EthMonth {
  const { year, month } = toEthiopian(parseGregorian(day));
  return { year, month };
}

export const formatMonthParam = ({ year, month }: EthMonth) => `${year}-${String(month).padStart(2, "0")}`;

/** A month from the query string ("2019-03"), or this month when missing, malformed or in the future. */
export function pickMonth(raw: string | undefined, today: string): EthMonth {
  const current = monthOf(today);
  const match = raw ? /^(\d{4})-(\d{2})$/.exec(raw) : null;
  if (!match) return current;
  const m = { year: Number(match[1]), month: Number(match[2]) };
  if (m.month < 1 || m.month > 13 || m.year < 1900) return current;
  const later = m.year > current.year || (m.year === current.year && m.month > current.month);
  return later ? current : m;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Adds up closed visits per clinic day (YYYY-MM-DD), oldest day first. Days with no visits are left out. */
export function summarizeByDay(
  visits: { day: string; paidTotal: number; debtPosted: number; billed: number }[],
): IncomeDayRow[] {
  const byDay = new Map<string, IncomeDayRow>();
  for (const v of visits) {
    const row = byDay.get(v.day) ?? { day: v.day, visits: 0, billed: 0, paid: 0, credit: 0 };
    row.visits += 1;
    row.billed = round(row.billed + v.billed);
    row.paid = round(row.paid + v.paidTotal);
    row.credit = round(row.credit + v.debtPosted);
    byDay.set(v.day, row);
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** One CSV cell: quoted when needed, and never starting with a formula character (spreadsheet injection). */
export function csvCell(value: string | number): string {
  let text = typeof value === "number" ? value.toFixed(2) : value;
  if (/^[=+\-@\t\r]/.test(text) && typeof value !== "number") text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export type CsvLabels = {
  section: { services: string; days: string; totals: string };
  columns: { service: string; kind: string; count: string; total: string; day: string; dayEth: string; visits: string; billed: string; paid: string; credit: string };
};

/**
 * The month as CSV: totals, then one row per service, then one row per day. Amounts have two decimals
 * and no thousands separators so spreadsheets read them as numbers. Starts with a BOM for Excel.
 */
export function monthlyIncomeCsv(
  report: MonthlyIncome,
  labels: CsvLabels,
  kindLabel: (kind: string) => string,
  dayLabel: (day: string) => string,
): string {
  const c = labels.columns;
  const line = (cells: (string | number)[]) => cells.map(csvCell).join(",");
  const rows = [
    line([labels.section.totals]),
    line([c.visits, c.billed, c.paid, c.credit]),
    line([String(report.visits), report.billed, report.paid, report.credit]),
    "",
    line([labels.section.services]),
    line([c.service, c.kind, c.count, c.total]),
    ...report.services.map((s) => line([s.serviceName, kindLabel(s.kind), String(s.count), s.total])),
    "",
    line([labels.section.days]),
    line([c.day, c.dayEth, c.visits, c.billed, c.paid, c.credit]),
    ...report.days.map((d) => line([d.day, dayLabel(d.day), String(d.visits), d.billed, d.paid, d.credit])),
  ];
  return `﻿${rows.join("\r\n")}\r\n`;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const addDays = (day: string, by: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
};

/** The Monday on or before a YYYY-MM-DD day (Ethiopian clinics count the week from Monday). */
export function weekStart(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, -((weekday + 6) % 7));
}

/** A week from the query string (any day in it, YYYY-MM-DD), as its Monday; this week when missing, malformed or in the future. */
export function pickWeek(raw: string | undefined, today: string): string {
  const current = weekStart(today);
  if (!raw || !DAY.test(raw)) return current;
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw) return current;
  const start = weekStart(raw);
  return start > current ? current : start;
}

/** Monday of the week before (by = -1) or after (by = 1). */
export const shiftWeek = (monday: string, by: number) => addDays(monday, 7 * by);

/** The week's Gregorian range: Monday and the next Monday (exclusive). */
export const weekRange = (monday: string) => ({ from: monday, to: addDays(monday, 7) });

/** The last day of the week (Sunday), for labels. */
export const weekEnd = (monday: string) => addDays(monday, 6);
