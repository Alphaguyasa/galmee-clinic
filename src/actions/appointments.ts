"use server";

import { revalidatePath } from "next/cache";
import { clinicInstant } from "@/lib/appointments";
import { bookAppointment, setAppointmentStatus, type AppointmentStatusResult, type BookResult } from "@/server/dal/appointments";
import { getSession } from "@/server/dal/session";
import { appointmentSchema, appointmentStatusSchema } from "@/server/validation";

export async function book(input: unknown): Promise<BookResult> {
  const parsed = appointmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const startsAt = clinicInstant(parsed.data.day, parsed.data.time);
  if (!startsAt) return { ok: false, code: "invalid" };
  // Server Actions are public endpoints: re-check the session here, not only on the page.
  await getSession();
  const result = await bookAppointment({
    patientId: parsed.data.patientId,
    doctorId: parsed.data.doctorId,
    startsAt,
    minutes: parsed.data.minutes,
    note: parsed.data.note ?? null,
  });
  if (result.ok) {
    revalidatePath(`/patients/${parsed.data.patientId}`);
    revalidatePath("/appointments");
  }
  return result;
}

export async function moveAppointment(input: unknown): Promise<AppointmentStatusResult> {
  const parsed = appointmentStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  await getSession();
  const result = await setAppointmentStatus(parsed.data);
  if (result.ok) {
    revalidatePath("/appointments");
    if (parsed.data.status === "checked_in") revalidatePath("/");
  }
  return result;
}
