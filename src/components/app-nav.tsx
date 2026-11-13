"use client";

import { useTranslations } from "next-intl";
import { ClipboardList, FlaskConical, ListChecks, UserCog, Users } from "lucide-react";
import { BottomNav } from "@/components/galmee/bottom-nav";

const ITEMS = [
  { href: "/", key: "queue", icon: ClipboardList, manager: false, lab: false },
  { href: "/patients", key: "patients", icon: Users, manager: false, lab: false },
  { href: "/lab", key: "lab", icon: FlaskConical, manager: false, lab: true },
  { href: "/services", key: "services", icon: ListChecks, manager: false, lab: false },
  { href: "/staff", key: "staff", icon: UserCog, manager: true, lab: false },
] as const;

/** Clinic destinations in the shared Galmee nav; manager-only items hide for staff, the lab for non-lab staff. */
export function AppNav({ variant, canManage, showLab }: { variant: "bottom" | "side"; canManage: boolean; showLab: boolean }) {
  const t = useTranslations("nav");
  return (
    <BottomNav
      variant={variant}
      menuLabel={t("menu")}
      items={ITEMS.filter((item) => (canManage || !item.manager) && (showLab || !item.lab)).map(({ href, key, icon }) => ({
        href,
        label: t(key),
        icon,
      }))}
    />
  );
}
