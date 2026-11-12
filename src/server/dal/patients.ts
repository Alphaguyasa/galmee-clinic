import "server-only";
import { birthDateForAge } from "@/lib/age";
import { createClient } from "@/lib/supabase/server";
import type { PatientInput } from "@/server/validation";
import { getSession } from "./session";

export type PatientRowDTO = {
  id: string;
  cardNo: number;
  fullName: string;
  phone: string | null;
  sex: "female" | "male" | null;
  birthDate: string | null;
};

export const PATIENT_PAGE_LIMIT = 50;

/**
 * Reception search. A number matches the card number exactly or any part of the
 * phone; anything else matches the name. Without a query: the newest patients.
 */
export async function searchPatients(q: string): Promise<PatientRowDTO[]> {
  await getSession();
  const supabase = await createClient();
  let query = supabase
    .from("cl_patients")
    .select("id, card_no, full_name, phone, sex, birth_date")
    .limit(PATIENT_PAGE_LIMIT);

  const digits = q.replace(/[\s+]/g, "");
  if (/^\d+$/.test(digits)) {
    const cardNo = digits.length <= 9 ? Number(digits) : -1;
    // A phone typed with the leading 0 or +251 is matched on its last 9 digits.
    const phonePart = digits.replace(/^(251|0)/, "");
    query = query.or(`card_no.eq.${cardNo},phone.like.*${phonePart}*`).order("card_no", { ascending: true });
  } else if (q) {
    const like = q.replace(/[\\%_]/g, (c) => `\\${c}`);
    query = query.ilike("full_name", `%${like}%`).order("full_name", { ascending: true });
  } else {
    query = query.order("card_no", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error("patients_failed");
  return data.map((row) => ({
    id: row.id,
    cardNo: row.card_no,
    fullName: row.full_name,
    phone: row.phone,
    sex: row.sex === "female" || row.sex === "male" ? row.sex : null,
    birthDate: row.birth_date,
  }));
}

export type RegisterResult = { ok: true; id: string; cardNo: number } | { ok: false };

export async function registerPatient(input: PatientInput): Promise<RegisterResult> {
  await getSession();
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("cl_register_patient", {
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_sex: input.sex,
    p_birth_date: input.age === undefined ? undefined : birthDateForAge(input.age),
    p_address: input.address,
    p_client_ref: input.clientRef,
  });
  if (error || !id) return { ok: false };
  const { data: row } = await supabase.from("cl_patients").select("card_no").eq("id", id).maybeSingle();
  if (!row) return { ok: false };
  return { ok: true, id, cardNo: row.card_no };
}
