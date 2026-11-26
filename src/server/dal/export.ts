import "server-only";
import type { ClinicExportInput, ExportTable } from "@/lib/clinic-export";
import { createClient } from "@/lib/supabase/server";
import { getClinicalRoles } from "./clinical-roles";
import { getSession } from "./session";

/** Rows read per request (the API returns at most 1000) and the most read from one table. */
const PAGE = 1000;
export const EXPORT_ROW_CAP = 50_000;

type Table =
  | "cl_patients"
  | "cl_visits"
  | "cl_visit_services"
  | "cl_services"
  | "cl_lab_orders"
  | "cl_lab_results"
  | "cl_visit_notes"
  | "cl_card_views"
  | "cl_staff_roles"
  | "profiles";

type Query = {
  order(column: string): Query;
  range(from: number, to: number): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
};

export type ExportResult = { ok: true; data: ClinicExportInput } | { ok: false; code: "forbidden" | "generic" };

/**
 * Everything this clinic has in Galmee, for the owner to keep or take elsewhere.
 * Row-level security limits every read to the caller's own clinic and to what the caller's
 * clinical roles allow; the role checks here only decide which sheets to read at all, so a
 * sheet the database would return empty is reported as left out instead of as having no rows.
 * Owner only, because the file holds every patient's phone number and every bill.
 */
export async function exportClinicData(): Promise<ExportResult> {
  const session = await getSession();
  if (session.profile.role !== "owner") return { ok: false, code: "forbidden" };
  const roles = await getClinicalRoles();
  const doctor = roles.has("doctor");
  const labAccess = doctor || roles.has("lab");
  // Read-only, column lists fixed in this file; a loose builder type covers every table alike.
  const db = (await createClient()) as unknown as { from(table: Table): { select(columns: string): Query } };

  async function readAll(table: Table, columns: string, order: string, unique: string): Promise<ExportTable> {
    // A unique last sort key keeps pages from repeating or skipping rows.
    const keys = order === unique ? [order] : [order, unique];
    const sorted = (q: Query) => keys.reduce((acc, k) => acc.order(k), q);
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; from < EXPORT_ROW_CAP; from += PAGE) {
      const to = Math.min(from + PAGE, EXPORT_ROW_CAP) - 1;
      const { data, error } = await sorted(db.from(table).select(columns)).range(from, to);
      if (error) throw new Error(`export_${table}`);
      const page = (data ?? []) as Record<string, unknown>[];
      rows.push(...page);
      if (page.length < to - from + 1) return { rows, truncated: false };
    }
    // Exactly at the cap: one more read tells whether anything was left out.
    const { data } = await sorted(db.from(table).select(unique)).range(EXPORT_ROW_CAP, EXPORT_ROW_CAP);
    return { rows, truncated: (data ?? []).length > 0 };
  }

  const none = Promise.resolve(null);
  try {
    const [patients, visits, visitServices, services, staff, staffRoles, labOrders, labResults, notes, cardViews] = await Promise.all([
      readAll("cl_patients", "id, card_no, full_name, sex, birth_date, phone, address, created_at", "card_no", "id"),
      readAll(
        "cl_visits",
        "id, patient_id, visit_date, queue_no, status, doctor_id, services_total, paid_total, debt_posted, opened_at, closed_at",
        "opened_at",
        "id",
      ),
      readAll(
        "cl_visit_services",
        "id, visit_id, service_name, kind, qty, unit_price, line_total, reversed_at, created_at",
        "created_at",
        "id",
      ),
      readAll("cl_services", "id, name, kind, price, active, created_at", "name", "id"),
      readAll("profiles", "user_id, full_name, role, active", "full_name", "user_id"),
      readAll("cl_staff_roles", "user_id, clinical_role", "user_id", "clinical_role"),
      labAccess
        ? readAll(
            "cl_lab_orders",
            "id, visit_id, patient_id, test_name, status, note, requested_by, requested_at, completed_at",
            "requested_at",
            "id",
          )
        : none,
      labAccess
        ? readAll(
            "cl_lab_results",
            "id, order_id, analyte, value, unit, reference_range, flag, entered_by, entered_at",
            "entered_at",
            "id",
          )
        : none,
      doctor
        ? readAll("cl_visit_notes", "visit_id, complaint, findings, diagnosis, treatment, author_id, updated_at", "updated_at", "visit_id")
        : none,
      readAll("cl_card_views", "id, patient_id, viewer_id, viewed_at", "viewed_at", "id"),
    ]);
    return {
      ok: true,
      data: {
        clinicName: session.tenant.name,
        patients,
        visits,
        visitServices,
        services,
        staff,
        staffRoles,
        labOrders,
        labResults,
        notes,
        cardViews,
      },
    };
  } catch {
    return { ok: false, code: "generic" };
  }
}
