import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  bookingErrorCode,
  clinicDayRange,
  type AppointmentRow,
  type AppointmentStatus,
} from "@/lib/appointments";
import { getSession } from "./session";

export type DoctorDTO = { userId: string; fullName: string };

/** Active staff who hold the doctor role here, by name. */
export async function listDoctors(): Promise<DoctorDTO[]> {
  await getSession();
  const supabase = await createClient();
  const { data: roles, error } = await supabase.from("cl_staff_roles").select("user_id").eq("clinical_role", "doctor").limit(100);
  if (error) throw new Error("doctors_failed");
  const ids = roles.map((r) => r.user_id);
  if (ids.length === 0) return [];
  const { data: people, error: pError } = await supabase
    .from("profiles")
    .select("user_id, full_name, active")
    .in("user_id", ids)
    .order("full_name")
    .limit(100);
  if (pError) throw new Error("doctors_failed");
  return people.filter((p) => p.active).map((p) => ({ userId: p.user_id, fullName: p.full_name }));
}

type BookingRow = { id: string; resource_id: string; starts_at: string; ends_at: string; status: string; notes: string | null; customer_id: string | null };

async function withPatients(rows: BookingRow[]): Promise<AppointmentRow[]> {
  const ids = [...new Set(rows.flatMap((r) => (r.customer_id ? [r.customer_id] : [])))];
  const supabase = await createClient();
  const patients = new Map<string, { id: string; card_no: number; full_name: string }>();
  if (ids.length > 0) {
    const { data, error } = await supabase.from("cl_patients").select("id, card_no, full_name, customer_id").in("customer_id", ids).limit(500);
    if (error) throw new Error("appointments_failed");
    for (const p of data) if (p.customer_id) patients.set(p.customer_id, p);
  }
  return rows.map((r) => {
    const p = r.customer_id ? patients.get(r.customer_id) : undefined;
    return {
      id: r.id,
      doctorId: r.resource_id,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      status: r.status as AppointmentStatus,
      note: r.notes,
      patientId: p?.id ?? null,
      cardNo: p?.card_no ?? null,
      fullName: p?.full_name ?? null,
    };
  });
}

/** Every appointment on one clinic day that was not cancelled, any doctor. */
export async function getAppointmentsForDay(day: string): Promise<AppointmentRow[]> {
  await getSession();
  const { from, to } = clinicDayRange(day);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, resource_id, starts_at, ends_at, status, notes, customer_id")
    .eq("resource_type", "cl_doctor")
    .neq("status", "cancelled")
    .gte("starts_at", from)
    .lt("starts_at", to)
    .order("starts_at")
    .limit(300);
  if (error) throw new Error("appointments_failed");
  return withPatients(data);
}

/** A patient's appointments still to come (booked, from today on), soonest first. */
export async function getUpcomingForPatient(customerId: string, today: string): Promise<AppointmentRow[]> {
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, resource_id, starts_at, ends_at, status, notes, customer_id")
    .eq("resource_type", "cl_doctor")
    .eq("customer_id", customerId)
    .eq("status", "booked")
    .gte("starts_at", clinicDayRange(today).from)
    .order("starts_at")
    .limit(10);
  if (error) throw new Error("appointments_failed");
  return withPatients(data);
}

export type BookResult = { ok: true } | { ok: false; code: string };

export async function bookAppointment(input: { patientId: string; doctorId: string; startsAt: string; minutes: number; note: string | null }): Promise<BookResult> {
  await getSession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cl_book_appointment", {
    p_patient: input.patientId,
    p_doctor: input.doctorId,
    p_starts_at: input.startsAt,
    p_minutes: input.minutes,
    p_note: input.note ?? undefined,
  });
  return error ? { ok: false, code: bookingErrorCode(error.message) } : { ok: true };
}

export type AppointmentStatusResult = { ok: true; visitId: string | null } | { ok: false; code: string };

export async function setAppointmentStatus(input: { bookingId: string; status: "checked_in" | "cancelled" | "no_show" }): Promise<AppointmentStatusResult> {
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cl_set_appointment_status", { p_booking: input.bookingId, p_status: input.status });
  return error ? { ok: false, code: bookingErrorCode(error.message) } : { ok: true, visitId: data ?? null };
}
