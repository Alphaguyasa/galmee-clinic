import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mergeOwed, type OwedRow } from "@/lib/owed";
import { getSession } from "./session";

export type OwedRowDTO = OwedRow;

/**
 * The 200 patients with the oldest unpaid debts (oldest first; the id list must stay short enough for one request), from the core `customer_balances` view.
 * Owner and manager only; returns null for anyone else.
 */
export async function listPatientsWhoOwe(): Promise<OwedRowDTO[] | null> {
  const { profile } = await getSession();
  if (profile.role !== "owner" && profile.role !== "manager") return null;
  const supabase = await createClient();
  const { data: balances, error } = await supabase
    .from("customer_balances")
    .select("customer_id, balance, oldest_debt_at")
    .gt("balance", 0)
    .order("oldest_debt_at", { ascending: true, nullsFirst: false })
    .limit(200);
  if (error) throw new Error("owed_failed");
  const ids = balances.flatMap((b) => (b.customer_id ? [b.customer_id] : []));
  if (ids.length === 0) return [];
  const { data: patients, error: pError } = await supabase
    .from("cl_patients")
    .select("id, card_no, full_name, phone, customer_id")
    .in("customer_id", ids)
    .limit(200);
  if (pError) throw new Error("owed_failed");
  return mergeOwed(balances, patients);
}
