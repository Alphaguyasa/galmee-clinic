import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "./session";

export type ClinicalRole = "doctor" | "lab" | "reception";

/** The signed-in user's clinical roles in this clinic. The database enforces them; this only decides what to show. */
export const getClinicalRoles = cache(async (): Promise<Set<ClinicalRole>> => {
  const { userId } = await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase.from("cl_staff_roles").select("clinical_role").eq("user_id", userId);
  if (error) return new Set();
  return new Set(data.map((r) => r.clinical_role as ClinicalRole));
});
