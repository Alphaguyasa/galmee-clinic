import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ClipboardList, Download, HandCoins, ListChecks, Receipt, Search } from "lucide-react";
import { getClinicalRoles } from "@/server/dal/clinical-roles";
import { CardNoTab } from "@/components/card-no-tab";
import { EmptyState } from "@/components/galmee/empty-state";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
import { buttonVariants } from "@/components/ui/button";
import { VisitStatusBadge } from "@/components/visit-status-badge";
import { isLocale, defaultLocale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { cn } from "@/lib/utils";
import { getSession } from "@/server/dal/session";
import { clinicToday, getTodayQueue } from "@/server/dal/visits";

const COUNTED = ["waiting", "with_doctor", "lab", "done"] as const;

/** Reception's home: today's bench of patients, in the order they arrived. */
export default async function QueuePage() {
  const [session, queue, roles, t, tStatus, tIncome, tOwed, tNav, tExport, locale] = await Promise.all([
    getSession(),
    getTodayQueue(),
    getClinicalRoles(),
    getTranslations("queue"),
    getTranslations("queue.status"),
    getTranslations("income"),
    getTranslations("owed"),
    getTranslations("nav"),
    getTranslations("export"),
    getLocale(),
  ]);
  const counts = Object.fromEntries(COUNTED.map((s) => [s, queue.filter((v) => v.status === s).length]));
  // Patients still on the bench first, finished visits at the bottom.
  const ordered = [...queue.filter((v) => v.status !== "done"), ...queue.filter((v) => v.status === "done")];

  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {formatEthiopianDate(clinicToday(), isLocale(locale) ? locale : defaultLocale)}
          </p>
        </div>
        <Link href="/patients" className={cn(buttonVariants(), "shrink-0")}>
          <Search aria-hidden />
          {t("findPatient")}
        </Link>
      </div>

      <dl className="grid grid-cols-4 divide-x rounded-md border bg-card text-center">
        {COUNTED.map((s) => (
          <div key={s} className="grid gap-0.5 px-1 py-2">
            <dt className="text-xs text-muted-foreground">{tStatus(s)}</dt>
            <dd className="num text-xl font-bold">{counts[s]}</dd>
          </div>
        ))}
      </dl>

      {session.profile.role === "owner" || session.profile.role === "manager" ? (
        <div className="flex flex-wrap gap-2">
          <Link href="/income" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
            <Receipt aria-hidden />
            {tIncome("link")}
          </Link>
          <Link href="/owed" prefetch={false} className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
            <HandCoins aria-hidden />
            {tOwed("link")}
          </Link>
          {roles.has("lab") ? (
            // The phone bar has no room for Prices when this person also runs the lab.
            <Link href="/services" className={cn(buttonVariants({ variant: "outline" }), "w-fit md:hidden")}>
              <ListChecks aria-hidden />
              {tNav("services")}
            </Link>
          ) : null}
        </div>
      ) : null}

      {ordered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          message={t("empty")}
          action={
            <Link href="/patients" className={buttonVariants({ variant: "outline" })}>
              <Search aria-hidden />
              {t("findPatient")}
            </Link>
          }
        />
      ) : (
        <ListSheet aria-label={t("title")}>
          {ordered.map((v) => (
            <ListRow
              key={v.id}
              href={`/visits/${v.id}`}
              mark={
                <span className="num grid size-10 place-items-center rounded-md bg-primary text-lg font-bold text-primary-foreground">
                  <span className="sr-only">{t("queueNo")} </span>
                  {v.queueNo}
                </span>
              }
              title={v.fullName}
              sub={
                <span className="flex items-center gap-2">
                  <CardNoTab cardNo={v.cardNo} label={t("cardNo")} className="h-6 min-w-10 text-sm" />
                </span>
              }
              right={<VisitStatusBadge status={v.status} />}
              className={v.status === "done" ? "opacity-70" : undefined}
            />
          ))}
        </ListSheet>
      )}

      {session.profile.role === "owner" ? (
        <section aria-labelledby="export-all" className="grid gap-2 border-t pt-5 md:max-w-md">
          <h2 id="export-all" className="text-lg font-bold">
            {tExport("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{tExport("hint")}</p>
          <a href="/export" download className={cn(buttonVariants({ variant: "outline", size: "lg" }), "justify-self-start")}>
            <Download className="size-4" aria-hidden />
            {tExport("button")}
          </a>
        </section>
      ) : null}
    </div>
  );
}
