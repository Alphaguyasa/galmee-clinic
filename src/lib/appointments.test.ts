import { describe, expect, it } from "vitest";
import {
  bookingErrorCode,
  clinicClock,
  clinicDayOf,
  clinicDayRange,
  clinicInstant,
  groupByDoctor,
  pickAppointmentDay,
  type AppointmentRow,
} from "./appointments";

describe("clinic clock", () => {
  it("turns a clinic day and time into the right instant", () => {
    expect(clinicInstant("2026-11-23", "09:30")).toBe("2026-11-23T06:30:00.000Z");
    expect(clinicInstant("2026-11-23", "01:00")).toBe("2026-11-22T22:00:00.000Z");
  });
  it("refuses malformed input", () => {
    expect(clinicInstant("2026-11-23", "9:30")).toBeNull();
    expect(clinicInstant("2026-11-23", "24:00")).toBeNull();
    expect(clinicInstant("23-11-2026", "09:30")).toBeNull();
  });
  it("reads an instant back on the clinic clock and day", () => {
    expect(clinicClock("2026-11-22T22:00:00.000Z")).toBe("01:00");
    expect(clinicDayOf("2026-11-22T22:00:00.000Z")).toBe("2026-11-23");
  });
  it("covers the whole clinic day", () => {
    expect(clinicDayRange("2026-11-23")).toEqual({ from: "2026-11-22T21:00:00.000Z", to: "2026-11-23T21:00:00.000Z" });
  });
});

describe("pickAppointmentDay", () => {
  it("accepts past and future days but not junk or far-off days", () => {
    expect(pickAppointmentDay("2026-11-30", "2026-11-22")).toBe("2026-11-30");
    expect(pickAppointmentDay("2026-11-01", "2026-11-22")).toBe("2026-11-01");
    expect(pickAppointmentDay("2026-02-30", "2026-11-22")).toBe("2026-11-22");
    expect(pickAppointmentDay("2028-01-01", "2026-11-22")).toBe("2026-11-22");
    expect(pickAppointmentDay(undefined, "2026-11-22")).toBe("2026-11-22");
  });
});

describe("groupByDoctor", () => {
  const row = (id: string, doctorId: string, startsAt: string): AppointmentRow => ({
    id,
    doctorId,
    startsAt,
    endsAt: startsAt,
    status: "booked",
    note: null,
    patientId: "p",
    cardNo: 1,
    fullName: "P",
  });
  it("groups by doctor name with each list in time order", () => {
    const g = groupByDoctor(
      [row("a", "d2", "2026-11-23T08:00:00Z"), row("b", "d1", "2026-11-23T07:00:00Z"), row("c", "d2", "2026-11-23T06:00:00Z")],
      new Map([
        ["d1", "Dr. Selam"],
        ["d2", "Dr. Abebe"],
      ]),
    );
    expect(g.map((d) => d.doctorName)).toEqual(["Dr. Abebe", "Dr. Selam"]);
    expect(g[0].rows.map((r) => r.id)).toEqual(["c", "a"]);
  });
});

describe("bookingErrorCode", () => {
  it("finds the code inside a database message", () => {
    expect(bookingErrorCode("doctor_busy")).toBe("doctor_busy");
    expect(bookingErrorCode("something else")).toBe("generic");
  });
});
