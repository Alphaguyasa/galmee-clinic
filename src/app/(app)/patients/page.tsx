import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ClipboardList, Search, UserPlus, Users } from "lucide-react";
import { CardNoTab } from "@/components/card-no-tab";
import { EmptyState } from "@/components/galmee/empty-state";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ageInYears } from "@/lib/age";
import { QueueButton } from "@/components/queue-button";
import { StatusBadge } from "@/components/galmee/status-badge";
import { searchPatients } from "@/server/dal/patients";
import { getOpenVisits } from "@/server/dal/visits";
import { cleanPatientQuery } from "@/server/validation";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string; new?: string }> }) {
  const params = await searchParams;
  const q = cleanPatientQuery(params.q);
  const newCardNo = Number(params.new) || null;
  const [patients, t, tQueue, format] = await Promise.all([
    searchPatients(q),
    getTranslations("patients"),
    getTranslations("queue"),
    getFormatter(),
  ]);
  const openVisits = await getOpenVisits(patients.map((p) => p.id));

  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
        <Link href="/patients/new" className={cn(buttonVariants(), "shrink-0")}>
          <UserPlus aria-hidden />
          {t("register")}
        </Link>
      </div>

      <form role="search" action="/patients" className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          {t("searchLabel")}
        </label>
        <Input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          enterKeyHint="search"
          className="flex-1"
        />
        <Button type="submit" size="icon" className="size-12 shrink-0" aria-label={t("search")}>
          <Search aria-hidden />
        </Button>
      </form>

      {newCardNo ? (
        <p role="status" className="rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm font-medium">
          {t("registered", { cardNo: newCardNo })}
        </p>
      ) : null}

      <section aria-labelledby="results" className="grid gap-2">
        <h2 id="results" className="text-sm font-semibold text-muted-foreground">
          {q ? t("resultsFor", { q, count: patients.length }) : t("newest")}
        </h2>
        {patients.length === 0 ? (
          <EmptyState
            icon={Users}
            message={q ? t("noMatch") : t("empty")}
            action={
              <Link href="/patients/new" className={buttonVariants({ variant: "outline" })}>
                <UserPlus aria-hidden />
                {t("register")}
              </Link>
            }
          />
        ) : (
          <ListSheet>
            {patients.map((p) => (
              <ListRow
                key={p.id}
                mark={<CardNoTab cardNo={p.cardNo} label={t("cardNo")} />}
                title={p.fullName}
                sub={
                  <span>
                    {[
                      p.phone,
                      p.sex ? t(p.sex) : null,
                      p.birthDate ? t("ageYears", { age: ageInYears(p.birthDate) }) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || t("noDetails")}
                  </span>
                }
                right={
                  openVisits.has(p.id) ? (
                    <StatusBadge tone="sync" icon={ClipboardList}>
                      {tQueue("inQueue", { queueNo: openVisits.get(p.id) ?? 0 })}
                    </StatusBadge>
                  ) : (
                    <QueueButton patientId={p.id} patientName={p.fullName} />
                  )
                }
                className={p.cardNo === newCardNo ? "bg-accent" : undefined}
              />
            ))}
          </ListSheet>
        )}
        {patients.length > 0 && !q ? (
          <p className="text-sm text-muted-foreground">{t("searchHint", { count: format.number(patients.length) })}</p>
        ) : null}
      </section>
    </div>
  );
}
