export type VisitStatus = "waiting" | "with_doctor" | "lab" | "done" | "cancelled";
export const OPEN_STATUSES = ["waiting", "with_doctor", "lab"] as const;

/** Statuses reception can move a visit to by hand; "done" only comes from billing. */
export const MOVABLE_STATUSES = ["waiting", "with_doctor", "lab", "cancelled"] as const;
export type MovableStatus = (typeof MOVABLE_STATUSES)[number];
