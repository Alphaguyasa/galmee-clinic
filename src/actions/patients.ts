"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registerPatient } from "@/server/dal/patients";
import { getSession } from "@/server/dal/session";
import { formToObject, patientSchema } from "@/server/validation";

export type PatientFormState = { error?: "errorName" | "errorPhone" | "errorAge" | "errorGeneric" } | undefined;

export async function addPatient(_prev: PatientFormState, formData: FormData): Promise<PatientFormState> {
  const parsed = patientSchema.safeParse(
    formToObject(formData, ["fullName", "phone", "sex", "age", "address", "clientRef"]),
  );
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "phone" ? "errorPhone" : field === "age" ? "errorAge" : field === "fullName" ? "errorName" : "errorGeneric" };
  }
  // Server Actions are public endpoints: re-check the session here, not only on the page.
  await getSession();
  const result = await registerPatient(parsed.data);
  if (!result.ok) return { error: "errorGeneric" };
  revalidatePath("/patients");
  redirect(`/patients?q=${result.cardNo}&new=${result.cardNo}`);
}
