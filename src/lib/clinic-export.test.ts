import { describe, expect, it } from "vitest";
import am from "../../messages/am.json";
import en from "../../messages/en.json";
import om from "../../messages/om.json";
import { clinicExportSheets, type ClinicExportInput } from "./clinic-export";
import { buildXlsx, sheetNames } from "./xlsx";

const table = (rows: Record<string, unknown>[], truncated = false) => ({ rows, truncated });

/** Looks keys up from the root of a messages file, with {cap}-style values, like next-intl does. */
function translator(messages: object) {
  return (key: string, values?: Record<string, string | number>): string => {
    const found = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], messages);
    if (typeof found !== "string") throw new Error(`missing ${key}`);
    return found.replace(/\{(\w+)\}/g, (_, k) => String(values?.[k] ?? ""));
  };
}
const t = translator(en);

const full: ClinicExportInput = {
  clinicName: "Hope Clinic",
  patients: table([
    { id: "p1", card_no: 17, full_name: "Chaltu T.", sex: "female", birth_date: "1990-03-01", phone: "0911000000", address: "Kebele 04", created_at: "2026-11-01T08:00:00Z" },
    { id: "p2", card_no: 18, full_name: "=HYPERLINK(\"x\")", sex: null, birth_date: null, phone: null, address: null, created_at: "2026-11-02T08:00:00Z" },
  ]),
  visits: table([
    { id: "v1", patient_id: "p1", visit_date: "2026-11-20", queue_no: 3, status: "done", doctor_id: "u2", services_total: "450.00", paid_total: 300, debt_posted: "150", opened_at: "2026-11-20T06:00:00Z", closed_at: "2026-11-20T07:30:00Z" },
  ]),
  visitServices: table([
    { id: "s1", visit_id: "v1", service_name: "Consultation", kind: "consultation", qty: 1, unit_price: 200, line_total: 200, reversed_at: null, created_at: "2026-11-20T06:10:00Z" },
    { id: "s2", visit_id: "v1", service_name: "CBC", kind: "lab", qty: 1, unit_price: 250, line_total: 250, reversed_at: null, created_at: "2026-11-20T06:12:00Z" },
    { id: "s3", visit_id: "v1", service_name: "Injection", kind: "procedure", qty: 1, unit_price: 50, line_total: 50, reversed_at: "2026-11-20T06:20:00Z", created_at: "2026-11-20T06:15:00Z" },
  ]),
  services: table([{ id: "sv1", name: "CBC", kind: "lab", price: "250.00", active: false, created_at: "2026-11-01T08:00:00Z" }]),
  staff: table([
    { user_id: "u1", full_name: "Abebe K.", role: "owner", active: true },
    { user_id: "u2", full_name: "Dr. Hana M.", role: "staff", active: true },
  ]),
  staffRoles: table([
    { user_id: "u2", clinical_role: "doctor" },
    { user_id: "u2", clinical_role: "lab" },
  ]),
  labOrders: table([
    { id: "o1", visit_id: "v1", patient_id: "p1", test_name: "CBC", status: "completed", note: null, requested_by: "u2", requested_at: "2026-11-20T06:12:00Z", completed_at: "2026-11-20T07:00:00Z" },
  ]),
  labResults: table([
    { id: "r1", order_id: "o1", analyte: "Hb", value: "11.2", unit: "g/dL", reference_range: "12-16", flag: "low", entered_by: "u2", entered_at: "2026-11-20T07:00:00Z" },
  ]),
  notes: table([
    { visit_id: "v1", complaint: "Fever", findings: null, diagnosis: "Malaria", treatment: "Coartem", author_id: "u2", updated_at: "2026-11-20T06:30:00Z" },
  ]),
  cardViews: table([{ id: 1, patient_id: "p1", viewer_id: "u1", viewed_at: "2026-11-20T06:05:00Z" }], true),
};

const sheet = (sheets: ReturnType<typeof clinicExportSheets>, name: string) => {
  const found = sheets.find((s) => s.name === name);
  if (!found) throw new Error(`no sheet ${name}`);
  return found.rows;
};

describe("clinicExportSheets", () => {
  const sheets = clinicExportSheets(full, t, "2026-11-26T16:00:00Z", 50_000);

  it("writes About first, then one sheet per record kind", () => {
    expect(sheets.map((s) => s.name)).toEqual([
      "About", "Patients", "Visits", "Billed services", "Price list", "Lab tests", "Lab results", "Doctors' notes", "Staff", "Card openings",
    ]);
  });

  it("writes codes as words and money as numbers", () => {
    expect(sheet(sheets, "Patients")[1]).toEqual([17, "Chaltu T.", "Female", "1990-03-01", "0911000000", "Kebele 04", "2026-11-01T08:00:00Z", "p1"]);
    expect(sheet(sheets, "Visits")[1]).toEqual([
      "2026-11-20", 3, 17, "Chaltu T.", "Done", "Dr. Hana M.", 450, 300, 150, "2026-11-20T06:00:00Z", "2026-11-20T07:30:00Z", "v1",
    ]);
    expect(sheet(sheets, "Price list")[1]).toEqual(["CBC", "Lab test", 250, "No", "2026-11-01T08:00:00Z"]);
  });

  it("puts card number and name beside every service line, and counts a taken-back line as 0", () => {
    const lines = sheet(sheets, "Billed services");
    expect(lines[1].slice(0, 9)).toEqual(["2026-11-20", 3, 17, "Chaltu T.", "Consultation", "Consultation", 1, 200, 200]);
    expect(lines[3][8]).toBe(0);
    expect(lines[3][9]).toBe("2026-11-20T06:20:00Z");
  });

  it("joins lab results to their test and patient, and notes to their visit", () => {
    expect(sheet(sheets, "Lab results")[1]).toEqual([
      "2026-11-20T07:00:00Z", 17, "Chaltu T.", "CBC", "Hb", "11.2", "g/dL", "12-16", "Low", "Dr. Hana M.", "o1",
    ]);
    expect(sheet(sheets, "Doctors' notes")[1].slice(0, 8)).toEqual(["2026-11-20", 3, 17, "Chaltu T.", "Fever", null, "Malaria", "Coartem"]);
  });

  it("lists every clinic role of a person in one cell", () => {
    expect(sheet(sheets, "Staff")[2]).toEqual(["Dr. Hana M.", "Reception", "Doctor, Lab", "Yes"]);
    expect(sheet(sheets, "Staff")[1]).toEqual(["Abebe K.", "Owner", null, "Yes"]);
  });

  it("keeps formula-looking text as text", () => {
    expect(sheet(sheets, "Patients")[2][1]).toBe("=HYPERLINK(\"x\")");
    const xml = new TextDecoder().decode(buildXlsx(sheets));
    expect(xml).not.toContain("<f>");
  });

  it("says in About how many rows each sheet has and which hit the cap", () => {
    const about = sheet(sheets, "About");
    expect(about[1]).toEqual(["Clinic", "Hope Clinic"]);
    expect(about.find((r) => r[0] === "Billed services")?.[1]).toBe(3);
    expect(about.find((r) => r[0] === "Card openings")?.[2]).toBe("First 50000 rows only; ask for a full copy");
  });

  it("leaves out the sheets the caller's role may not read, and says why", () => {
    const owner = clinicExportSheets({ ...full, labOrders: null, labResults: null, notes: null }, t, "x", 50_000);
    const names = owner.map((s) => s.name);
    expect(names).not.toContain("Lab tests");
    expect(names).not.toContain("Lab results");
    expect(names).not.toContain("Doctors' notes");
    const about = sheet(owner, "About");
    expect(about.find((r) => r[0] === "Doctors' notes")).toEqual(["Doctors' notes", null, "Not included: needs the doctor role"]);
    expect(about.find((r) => r[0] === "Lab tests")?.[2]).toBe("Not included: needs the doctor or lab role");
  });

  it("has every word in Amharic and Afaan Oromo, and sheet names Excel accepts", () => {
    for (const messages of [am, om]) {
      const built = clinicExportSheets(full, translator(messages), "x", 50_000);
      const names = built.map((s) => s.name);
      expect(sheetNames(names)).toEqual(names);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
