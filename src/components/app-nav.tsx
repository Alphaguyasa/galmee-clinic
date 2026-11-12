"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { BottomNav } from "@/components/galmee/bottom-nav";

const ITEMS = [{ href: "/", key: "home", icon: Search, manager: false }] as const;

/** Clinic destinations in the shared Galmee nav; manager-only items hide for staff. */
export function AppNav({ variant, canManage }: { variant: "bottom" | "side"; canManage: boolean }) {
  const t = useTranslations("nav");
  return (
    <BottomNav
      variant={variant}
      menuLabel={t("menu")}
      items={ITEMS.filter((item) => canManage || !item.manager).map(({ href, key, icon }) => ({
        href,
        label: t(key),
        icon,
      }))}
    />
  );
}
