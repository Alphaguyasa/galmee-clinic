export type IncomeVisit = {
  paidTotal: number;
  debtPosted: number;
  lines: { serviceId: string; serviceName: string; kind: string; lineTotal: number; reversed: boolean }[];
};

export type IncomeByService = { serviceId: string; serviceName: string; kind: string; count: number; total: number };

export type DailyIncome = {
  visits: number;
  billed: number;
  paid: number;
  credit: number;
  services: IncomeByService[];
};

const round = (n: number) => Math.round(n * 100) / 100;

/** Adds up closed visits by service, biggest earner first. Reversed lines are left out. */
export function summarizeIncome(visits: IncomeVisit[]): DailyIncome {
  const byService = new Map<string, IncomeByService>();
  let billed = 0;
  let paid = 0;
  let credit = 0;
  for (const v of visits) {
    paid += v.paidTotal;
    credit += v.debtPosted;
    for (const l of v.lines) {
      if (l.reversed) continue;
      billed += l.lineTotal;
      const row = byService.get(l.serviceId) ?? { serviceId: l.serviceId, serviceName: l.serviceName, kind: l.kind, count: 0, total: 0 };
      row.count += 1;
      row.total = round(row.total + l.lineTotal);
      byService.set(l.serviceId, row);
    }
  }
  return {
    visits: visits.length,
    billed: round(billed),
    paid: round(paid),
    credit: round(credit),
    services: [...byService.values()].sort((a, b) => b.total - a.total || a.serviceName.localeCompare(b.serviceName)),
  };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A YYYY-MM-DD day from the query string, or `today` when missing, malformed or in the future. */
export function pickIncomeDay(raw: string | undefined, today: string): string {
  if (!raw || !DAY.test(raw)) return today;
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw) return today;
  return raw > today ? today : raw;
}

/** The day before or after a YYYY-MM-DD day. */
export function shiftDay(day: string, by: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}
