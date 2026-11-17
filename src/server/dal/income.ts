import "server-only";
import { createClient } from "@/lib/supabase/server";
import { summarizeIncome, type DailyIncome } from "@/lib/income";
import { getSession } from "./session";

/**
 * Income for one clinic day (Addis Ababa): every visit closed and billed that day, by service.
 * Owner and manager only.
 */
export async function getDailyIncome(day: string): Promise<DailyIncome | null> {
  const { profile } = await getSession();
  if (profile.role !== "owner" && profile.role !== "manager") return null;
  const supabase = await createClient();
  const from = `${day}T00:00:00+03:00`;
  const next = new Date(`${day}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const to = `${next.toISOString().slice(0, 10)}T00:00:00+03:00`;
  const { data, error } = await supabase
    .from("cl_visits")
    .select("paid_total, debt_posted, cl_visit_services(service_id, service_name, kind, line_total, reversed_at)")
    .eq("status", "done")
    .gte("closed_at", from)
    .lt("closed_at", to)
    .limit(2000);
  if (error) throw new Error("income_failed");
  return summarizeIncome(
    data.map((v) => ({
      paidTotal: Number(v.paid_total),
      debtPosted: Number(v.debt_posted),
      lines: v.cl_visit_services.map((l) => ({
        serviceId: l.service_id,
        serviceName: l.service_name,
        kind: l.kind,
        lineTotal: Number(l.line_total ?? 0),
        reversed: Boolean(l.reversed_at),
      })),
    })),
  );
}
