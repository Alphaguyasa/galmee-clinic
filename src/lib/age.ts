/** Birth date stored for an age given in whole years: the same day, that many years back. */
export function birthDateForAge(age: number, today = new Date()): string {
  const d = new Date(Date.UTC(today.getUTCFullYear() - age, today.getUTCMonth(), today.getUTCDate()));
  return d.toISOString().slice(0, 10);
}

/** Whole years between a stored birth date (YYYY-MM-DD) and today. */
export function ageInYears(birthDate: string, today = new Date()): number {
  const b = new Date(`${birthDate}T00:00:00Z`);
  let age = today.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < b.getUTCMonth() ||
    (today.getUTCMonth() === b.getUTCMonth() && today.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age -= 1;
  return Math.max(age, 0);
}
