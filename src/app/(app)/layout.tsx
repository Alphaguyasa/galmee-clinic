import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { getClinicalRoles } from "@/server/dal/clinical-roles";
import { getSession } from "@/server/dal/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ profile, tenant }, roles, tRoles] = await Promise.all([getSession(), getClinicalRoles(), getTranslations("roles")]);
  return (
    <AppShell
      tenantName={tenant.name}
      logoUrl={tenant.logoUrl}
      userName={profile.fullName}
      roleLabel={tRoles(profile.role)}
      canManage={profile.role !== "staff"}
      showLab={roles.has("lab")}
    >
      {children}
    </AppShell>
  );
}
