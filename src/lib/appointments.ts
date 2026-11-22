// Appointment helpers. Ethiopia keeps one offset all year (UTC+3, no summer time), so clinic
// wall-clock times convert to instants with a fixed offset.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const APPOINTMENT_MINUTES = [15, 30, 45, 60] as const;
export type AppointmentStatus = "booked" | "checked_in" | "done" | "cancelled" | "no_show";

/** A valid YYYY-MM-DD day from the query string, else today. Unlike income, future days are allowed (up to a year). */
export function pickAppointmentDay(raw: string | undefined, today: string): string {
  if (!raw || !DAY.test(raw)) return today;
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw) return today;
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 366);
  return d > limit ? today : raw;
}

/** The instant of a clinic day and HH:MM, as an ISO string; null when either part is malformed. */
export function clinicInstant(day: string, clock: string): string | null {
  if (!DAY.test(day) || !CLOCK.test(clock)) return null;
  const d = new Date(`${day}T${clock}:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Start and end instants of one clinic day, for range queries. */
export function clinicDayRange(day: string): { from: string; to: string } {
  const from = new Date(`${day}T00:00:00+03:00`);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** HH:MM on the clinic clock for an instant. */
export function clinicClock(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 3 * 60 * 60 * 1000);
  return d.toISOString().slice(11, 16);
}

/** The clinic day (YYYY-MM-DD) of an instant. */
export function clinicDayOf(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export type AppointmentRow = {
  id: string;
  doctorId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  note: string | null;
  patientId: string | null;
  cardNo: number | null;
  fullName: string | null;
};

export type DoctorDay = { doctorId: string; doctorName: string; rows: AppointmentRow[] };

/** Groups a day's appointments by doctor (by name), each list in time order; doctors with nothing booked are left out. */
export function groupByDoctor(rows: AppointmentRow[], names: Map<string, string>): DoctorDay[] {
  const by = new Map<string, AppointmentRow[]>();
  for (const r of rows) by.set(r.doctorId, [...(by.get(r.doctorId) ?? []), r]);
  return [...by.entries()]
    .map(([doctorId, list]) => ({
      doctorId,
      doctorName: names.get(doctorId) ?? "—",
      rows: list.sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    }))
    .sort((a, b) => a.doctorName.localeCompare(b.doctorName));
}

/** Maps a database error message to a short code the screen can translate. */
export function bookingErrorCode(message: string): string {
  for (const code of ["doctor_busy", "patient_busy", "doctor_not_found", "patient_not_found", "in_past", "too_far", "bad_minutes", "not_today", "not_yet", "appointment_closed", "appointment_not_found"]) {
    if (message.includes(code)) return code;
  }
  return "generic";
}
