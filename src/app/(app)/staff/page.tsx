import { getTranslations } from "next-intl/server";
import { listStaffRoles } from "@/server/dal/clinical-roles";
import { getSession } from "@/server/dal/session";
import { StaffRoleToggles } from "@/components/staff-roles";

/** Who is doctor, lab and reception. These roles decide who reads notes and lab results. */
export default async function StaffPage() {
  const [session, staff, t, tRoles] = await Promise.all([
    getSession(),
    listStaffRoles(),
    getTranslations("staff"),
    getTranslations("roles"),
  ]);
  const canEdit = session.profile.role === "owner";

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5">
      <div className="grid gap-1">
        <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{canEdit ? t("intro") : t("introReadOnly")}</p>
      </div>
      <ul className="grid gap-3">
        {staff.map((p) => (
          <li key={p.userId} className="grid gap-3 rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold break-words">
                {p.fullName}
                {p.userId === session.userId ? <span className="font-normal text-muted-foreground"> · {t("you")}</span> : null}
              </span>
              <span className="text-sm text-muted-foreground">
                {tRoles(p.appRole)}
                {p.active ? "" : ` · ${t("inactive")}`}
              </span>
            </div>
            <StaffRoleToggles userId={p.userId} name={p.fullName} roles={p.roles} canEdit={canEdit && p.active} />
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">{t("privacyNote")}</p>
    </div>
  );
}
