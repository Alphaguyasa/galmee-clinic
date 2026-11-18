import "server-only";
import { createClient } from "@/lib/supabase/server";
import { summarizeIncome, type DailyIncome, type IncomeVisit } from "@/lib/income";
import { monthRange, summarizeByDay, type EthMonth, type MonthlyIncome } from "@/lib/month-report";
import { getSession } from "./session";

const addisDay = (ts: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date(ts));

/** Closed and billed visits with their service lines, for clinic days [fromDay, toDay). Owner and manager only. */
async function closedVisits(fromDay: string, toDay: string): Promise<(IncomeVisit & { day: string })[] | null> {
  const { profile } = await getSession();
  if (profile.role !== "owner" && profile.role !== "manager") return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cl_visits")
    .select("closed_at, paid_total, debt_posted, cl_visit_services(service_id, service_name, kind, line_total, reversed_at)")
    .eq("status", "done")
    .gte("closed_at", `${fromDay}T00:00:00+03:00`)
    .lt("closed_at", `${toDay}T00:00:00+03:00`)
    .order("closed_at", { ascending: true })
    .limit(10000);
  if (error) throw new Error("income_failed");
  return data.map((v) => ({
    day: v.closed_at ? addisDay(v.closed_at) : fromDay,
    paidTotal: Number(v.paid_total),
    debtPosted: Number(v.debt_posted),
    lines: v.cl_visit_services.map((l) => ({
      serviceId: l.service_id,
      serviceName: l.service_name,
      kind: l.kind,
      lineTotal: Number(l.line_total ?? 0),
      reversed: Boolean(l.reversed_at),
    })),
  }));
}

/**
 * Income for one clinic day (Addis Ababa): every visit closed and billed that day, by service.
 * Owner and manager only.
 */
export async function getDailyIncome(day: string): Promise<DailyIncome | null> {
  const next = new Date(`${day}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const visits = await closedVisits(day, next.toISOString().slice(0, 10));
  return visits ? summarizeIncome(visits) : null;
}

/** Income for one Ethiopian month: totals, by service and by day. Owner and manager only. */
export async function getMonthlyIncome(month: EthMonth): Promise<MonthlyIncome | null> {
  const { from, to } = monthRange(month);
  const visits = await closedVisits(from, to);
  if (!visits) return null;
  const days = summarizeByDay(
    visits.map((v) => ({
      day: v.day,
      paidTotal: v.paidTotal,
      debtPosted: v.debtPosted,
      billed: v.lines.reduce((sum, l) => (l.reversed ? sum : sum + l.lineTotal), 0),
    })),
  );
  return { ...summarizeIncome(visits), days };
}
