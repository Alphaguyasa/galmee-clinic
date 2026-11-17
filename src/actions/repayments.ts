"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/dal/session";
import { recordPatientRepayment, type RepaymentResult } from "@/server/dal/patient-card";
import { repaymentSchema } from "@/server/validation";

export async function payBalance(input: unknown): Promise<RepaymentResult | { ok: false; code: "amount" | "reference" }> {
  const parsed = repaymentSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { ok: false, code: field === "reference" ? "reference" : field === "amount" ? "amount" : "generic" };
  }
  // Server Actions are public endpoints: re-check the session here, not only on the page.
  await getSession();
  const result = await recordPatientRepayment(parsed.data);
  if (result.ok) revalidatePath(`/patients/${parsed.data.patientId}`);
  return result;
}
