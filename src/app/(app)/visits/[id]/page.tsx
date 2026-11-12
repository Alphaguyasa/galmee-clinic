import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { CardNoTab } from "@/components/card-no-tab";
import { VisitStatusBadge } from "@/components/visit-status-badge";
import { VisitStatusControl } from "@/components/visit-status-control";
import { VisitServices } from "@/components/visit-services";
import { defaultLocale, isLocale } from "@/i18n/config";
import { formatBirr } from "@/lib/money";
import { listServices } from "@/server/dal/services";
import { getVisit, getVisitLines } from "@/server/dal/visits";

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [visit, lines, services, t, tQueue, rawLocale] = await Promise.all([
    getVisit(id),
    getVisitLines(id),
    listServices(),
    getTranslations("visit"),
    getTranslations("queue"),
    getLocale(),
  ]);
  if (!visit) notFound();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const open = visit.status === "waiting" || visit.status === "with_doctor" || visit.status === "lab";

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6 *:min-w-0">
      <Link href="/" className="inline-flex h-11 items-center gap-2 text-sm font-medium text-primary">
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToQueue")}
      </Link>

      <header className="flex items-start gap-3">
        <span className="num grid size-12 shrink-0 place-items-center rounded-md bg-primary text-xl font-bold text-primary-foreground">
          <span className="sr-only">{tQueue("queueNo")} </span>
          {visit.queueNo}
        </span>
        <div className="grid min-w-0 flex-1 gap-1.5">
          <h1 className="text-[1.5625rem] leading-tight font-bold break-words">{visit.patient.fullName}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <CardNoTab cardNo={visit.patient.cardNo} label={tQueue("cardNo")} />
            <VisitStatusBadge status={visit.status} />
          </div>
          {visit.patient.phone ? <p className="num text-sm text-muted-foreground">{visit.patient.phone}</p> : null}
        </div>
      </header>

      {open ? (
        <section className="rounded-md border bg-card p-4">
          <VisitStatusControl visitId={visit.id} status={visit.status} />
        </section>
      ) : null}

      <section aria-labelledby="services" className="grid gap-3 rounded-md border bg-card p-4">
        <h2 id="services" className="text-lg font-bold">
          {t("services")}
        </h2>
        {open ? (
          <VisitServices
            visitId={visit.id}
            options={services
              .filter((s) => s.active)
              .map((s) => ({ id: s.id, name: s.name, priceText: formatBirr(s.price, locale) }))}
            lines={lines.map((l) => ({ id: l.id, serviceName: l.serviceName, qty: l.qty, totalText: formatBirr(l.lineTotal, locale) }))}
            totalText={formatBirr(visit.servicesTotal, locale)}
          />
        ) : (
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">{t("total")}</span>
            <span className="num text-xl font-bold">{formatBirr(visit.servicesTotal, locale)}</span>
          </div>
        )}
      </section>

      {open ? null : (
        <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">{t("closedNote")}</p>
      )}
    </div>
  );
}
