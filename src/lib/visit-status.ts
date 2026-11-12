export type VisitStatus = "waiting" | "with_doctor" | "lab" | "done" | "cancelled";
export const OPEN_STATUSES = ["waiting", "with_doctor", "lab"] as const;
