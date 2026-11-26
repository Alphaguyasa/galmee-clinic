import type { XlsxCell, XlsxSheet } from "@/lib/xlsx";

type Row = Record<string, unknown>;
export type ExportTable = { rows: Row[]; truncated: boolean };

/**
 * What the export read. A sheet the caller's clinical role may not read is `null`: clinical
 * notes need the doctor role, lab data the doctor or lab role, the card-opening log the owner
 * or manager. Those sheets are left out and the About sheet says why.
 */
export type ClinicExportInput = {
  clinicName: string;
  patients: ExportTable;
  visits: ExportTable;
  visitServices: ExportTable;
  services: ExportTable;
  staff: ExportTable;
  staffRoles: ExportTable;
  labOrders: ExportTable | null;
  labResults: ExportTable | null;
  notes: ExportTable | null;
  cardViews: ExportTable | null;
};

/** Root translator: keys such as `export.col.name` or `services.kinds.lab`. */
export type ExportT = (key: string, values?: Record<string, string | number>) => string;

const text = (v: unknown): XlsxCell => (v === null || v === undefined || v === "" ? null : String(v));
const num = (v: unknown): XlsxCell => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};
const money = (v: unknown): XlsxCell => {
  const n = num(v);
  return typeof n === "number" ? Math.round(n * 100) / 100 : null;
};

function index(rows: Row[], key: string): Map<string, Row> {
  return new Map(rows.map((r) => [String(r[key]), r]));
}

/** Stored codes with a word on the screens already; anything else is written as stored. */
const WORDS: Record<string, { prefix: string; codes: readonly string[] }> = {
  sex: { prefix: "lab.sex", codes: ["female", "male"] },
  visitStatus: { prefix: "queue.status", codes: ["waiting", "with_doctor", "lab", "done", "cancelled"] },
  serviceKind: { prefix: "services.kinds", codes: ["consultation", "lab", "procedure", "other"] },
  labStatus: { prefix: "lab.status", codes: ["requested", "completed", "cancelled"] },
  flag: { prefix: "lab.flags", codes: ["normal", "low", "high", "abnormal"] },
  appRole: { prefix: "roles", codes: ["owner", "manager", "staff"] },
  clinicalRole: { prefix: "staff.roles", codes: ["doctor", "lab", "reception"] },
};

/** Why a sheet can be missing, by sheet key. */
const NEEDS: Record<string, string> = {
  labOrders: "needsLab",
  labResults: "needsLab",
  notes: "needsDoctor",
  cardViews: "needsManager",
};

/**
 * The owner's full export as workbook sheets: one sheet per kind of record, with the card
 * number and patient name beside every visit, service line and lab test so the file reads
 * without the app, and an "About" sheet first that says when it was made, how many rows each
 * sheet has, which sheets hit the row cap and which were left out for the caller's role.
 */
export function clinicExportSheets(data: ClinicExportInput, t: ExportT, exportedAt: string, rowCap: number): XlsxSheet[] {
  const e = (key: string, values?: Record<string, string | number>) => t(`export.${key}`, values);
  const yesNo = (v: unknown): XlsxCell => (v === null || v === undefined ? null : v ? e("yes") : e("no"));
  const word = (kind: keyof typeof WORDS, v: unknown): XlsxCell => {
    if (v === null || v === undefined || v === "") return null;
    const { prefix, codes } = WORDS[kind];
    return codes.includes(String(v)) ? t(`${prefix}.${String(v)}`) : String(v);
  };
  const head = (...keys: string[]) => keys.map((k) => e(`col.${k}`));

  const patients = index(data.patients.rows, "id");
  const visits = index(data.visits.rows, "id");
  const staffById = index(data.staff.rows, "user_id");
  const orders = index(data.labOrders?.rows ?? [], "id");

  const person = (id: unknown): XlsxCell => (id ? text(staffById.get(String(id))?.full_name) : null);
  /** Card number and name of a patient. */
  const patient = (id: unknown): [XlsxCell, XlsxCell] => {
    const p = id === null || id === undefined ? undefined : patients.get(String(id));
    return p ? [num(p.card_no), text(p.full_name)] : [null, null];
  };
  /** Visit day, queue number, card number and name for a visit id. */
  const visit = (id: unknown): [XlsxCell, XlsxCell, XlsxCell, XlsxCell] => {
    const v = id === null || id === undefined ? undefined : visits.get(String(id));
    return v ? [text(v.visit_date), num(v.queue_no), ...patient(v.patient_id)] : [null, null, null, null];
  };

  const rolesByUser = new Map<string, string[]>();
  for (const r of data.staffRoles.rows) {
    const key = String(r.user_id);
    const w = word("clinicalRole", r.clinical_role);
    if (typeof w === "string") rolesByUser.set(key, [...(rolesByUser.get(key) ?? []), w]);
  }

  type Built = { key: string; table: ExportTable | null; rows: XlsxCell[][] };
  const sheets: Built[] = [
    {
      key: "patients",
      table: data.patients,
      rows: [
        head("cardNo", "name", "sex", "birthDate", "phone", "address", "registered", "id"),
        ...data.patients.rows.map((r) => [
          num(r.card_no), text(r.full_name), word("sex", r.sex), text(r.birth_date), text(r.phone), text(r.address), text(r.created_at), text(r.id),
        ]),
      ],
    },
    {
      key: "visits",
      table: data.visits,
      rows: [
        head("day", "queueNo", "cardNo", "name", "status", "doctor", "billed", "paid", "credit", "opened", "closed", "id"),
        ...data.visits.rows.map((r) => [
          text(r.visit_date), num(r.queue_no), ...patient(r.patient_id), word("visitStatus", r.status), person(r.doctor_id),
          money(r.services_total), money(r.paid_total), money(r.debt_posted), text(r.opened_at), text(r.closed_at), text(r.id),
        ]),
      ],
    },
    {
      key: "visitServices",
      table: data.visitServices,
      rows: [
        head("day", "queueNo", "cardNo", "name", "service", "kind", "qty", "unitPrice", "lineTotal", "takenBack", "added", "visitId"),
        ...data.visitServices.rows.map((r) => [
          ...visit(r.visit_id), text(r.service_name), word("serviceKind", r.kind), num(r.qty), money(r.unit_price),
          r.reversed_at ? 0 : money(r.line_total), text(r.reversed_at), text(r.created_at), text(r.visit_id),
        ]),
      ],
    },
    {
      key: "services",
      table: data.services,
      rows: [
        head("service", "kind", "price", "offered", "created"),
        ...data.services.rows.map((r) => [text(r.name), word("serviceKind", r.kind), money(r.price), yesNo(r.active), text(r.created_at)]),
      ],
    },
    {
      key: "labOrders",
      table: data.labOrders,
      rows: [
        head("requested", "day", "queueNo", "cardNo", "name", "test", "status", "note", "requestedBy", "completed", "id"),
        ...(data.labOrders?.rows ?? []).map((r) => [
          text(r.requested_at), ...visit(r.visit_id), text(r.test_name), word("labStatus", r.status), text(r.note),
          person(r.requested_by), text(r.completed_at), text(r.id),
        ]),
      ],
    },
    {
      key: "labResults",
      table: data.labResults,
      rows: [
        head("entered", "cardNo", "name", "test", "analyte", "value", "unit", "range", "flag", "enteredBy", "orderId"),
        ...(data.labResults?.rows ?? []).map((r) => {
          const o = r.order_id ? orders.get(String(r.order_id)) : undefined;
          return [
            text(r.entered_at), ...patient(o?.patient_id), text(o?.test_name), text(r.analyte), text(r.value), text(r.unit),
            text(r.reference_range), word("flag", r.flag), person(r.entered_by), text(r.order_id),
          ];
        }),
      ],
    },
    {
      key: "notes",
      table: data.notes,
      rows: [
        head("day", "queueNo", "cardNo", "name", "complaint", "findings", "diagnosis", "treatment", "writtenBy", "updated", "visitId"),
        ...(data.notes?.rows ?? []).map((r) => [
          ...visit(r.visit_id), text(r.complaint), text(r.findings), text(r.diagnosis), text(r.treatment), person(r.author_id),
          text(r.updated_at), text(r.visit_id),
        ]),
      ],
    },
    {
      key: "staff",
      table: data.staff,
      rows: [
        head("name", "appRole", "clinicalRoles", "active"),
        ...data.staff.rows.map((r) => [
          text(r.full_name), word("appRole", r.role), rolesByUser.get(String(r.user_id))?.join(", ") ?? null, yesNo(r.active),
        ]),
      ],
    },
    {
      key: "cardViews",
      table: data.cardViews,
      rows: [
        head("openedAt", "cardNo", "name", "openedBy"),
        ...(data.cardViews?.rows ?? []).map((r) => [text(r.viewed_at), ...patient(r.patient_id), person(r.viewer_id)]),
      ],
    },
  ];

  const included = sheets.filter((s) => s.table !== null);
  const about: XlsxCell[][] = [
    [e("about.field"), e("about.value")],
    [e("about.business"), data.clinicName],
    [e("about.exportedAt"), exportedAt],
    [e("about.dates"), e("about.datesNote")],
    [e("about.private"), e("about.privateNote")],
    [],
    [e("about.sheet"), e("about.rows")],
    ...sheets.map((s) =>
      s.table === null
        ? [e(`sheet.${s.key}`), null, e(`about.${NEEDS[s.key]}`)]
        : [e(`sheet.${s.key}`), s.rows.length - 1, s.table.truncated ? e("about.truncated", { cap: rowCap }) : null],
    ),
  ];

  return [{ name: e("sheet.about"), rows: about }, ...included.map((s) => ({ name: e(`sheet.${s.key}`), rows: s.rows }))];
}
