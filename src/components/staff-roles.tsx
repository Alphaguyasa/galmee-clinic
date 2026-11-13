"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toggleClinicalRole } from "@/actions/staff";

const ROLES = ["doctor", "lab", "reception"] as const;
type Role = (typeof ROLES)[number];

/** One person's clinical roles as three toggles. Read-only unless the viewer is the owner. */
export function StaffRoleToggles({
  userId,
  name,
  roles,
  canEdit,
}: {
  userId: string;
  name: string;
  roles: Role[];
  canEdit: boolean;
}) {
  const t = useTranslations("staff");
  const [optimistic, setOptimistic] = useOptimistic(roles, (state: Role[], change: { role: Role; on: boolean }) =>
    change.on ? [...state, change.role] : state.filter((r) => r !== change.role),
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <fieldset className="grid gap-2">
      <legend className="sr-only">{t("rolesFor", { name })}</legend>
      <div className="grid grid-cols-3 gap-2">
        {ROLES.map((role) => (
          <label
            key={role}
            className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border bg-card px-2 text-sm font-medium has-checked:border-primary has-checked:bg-accent has-disabled:cursor-default has-disabled:opacity-70 has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={optimistic.includes(role)}
              disabled={!canEdit || pending}
              onChange={(e) => {
                const on = e.target.checked;
                start(async () => {
                  setError(null);
                  setOptimistic({ role, on });
                  const r = await toggleClinicalRole({ userId, role, on });
                  if (!r.ok) setError(t(r.code === "notAllowed" ? "errorNotAllowed" : "errorGeneric"));
                });
              }}
            />
            {t(`roles.${role}`)}
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
