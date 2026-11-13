import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { CardNoTab } from "@/components/card-no-tab";
import { VisitStatusBadge } from "@/components/visit-status-badge";
import { VisitStatusControl } from "@/components/visit-status-control";
import { VisitServices } from "@/components/visit-services";
import { CloseVisit } from "@/components/close-visit";
import { VisitReceipt } from "@/components/visit-receipt";
import { VisitLabs } from "@/components/visit-labs";
import { getClinicalRoles } from "@/server/dal/clinical-roles";
import { getVisitLabOrders } from "@/server/dal/labs";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { defaultLocale, isLocale } from "@/i18n/config";
import { formatBirr } from "@/lib/money";
import { listServices } from "@/server/dal/services";
import { getSession } from "@/server/dal/session";
import { countPendingLabs, getVisit, getVisitLines, getVisitPayments } from "@/server/dal/visits";

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [session, roles, visit, lines, services, pendingLabs, payments, labOrders, t, tQueue, rawLocale] = await Promise.all([
    getSession(),
    getClinicalRoles(),
    getVisit(id),
    getVisitLines(id),
    listServices(),
    countPendingLabs(id),
    getVisitPayments(id),
    getVisitLabOrders(id),
    getTranslations("visit"),
    getTranslations("queue"),
    getLocale(),
  ]);
  if (!visit) notFound();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const open = visit.status === "waiting" || visit.status === "with_doctor" || visit.status === "lab";
  const isDoctor = roles.has("doctor");
  const seesLabs = isDoctor || roles.has("lab");

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

      {seesLabs && (labOrders.length > 0 || (open && isDoctor)) ? (
        <section aria-labelledby="labs" className="grid gap-3 rounded-md border bg-card p-4">
          <h2 id="labs" className="text-lg font-bold">
            {t("labs")}
          </h2>
          <VisitLabs
            visitId={visit.id}
            orders={labOrders.map((o) => ({ id: o.id, testName: o.testName, note: o.note, status: o.status }))}
            options={services
              .filter((s) => s.active && s.kind === "lab")
              .map((s) => ({ id: s.id, name: s.name, priceText: formatBirr(s.price, locale) }))}
            canRequest={open && isDoctor}
          />
        </section>
      ) : null}

      {open ? (
        <section aria-label={t("closeAndBill")} className="grid gap-2">
          <CloseVisit
            key={visit.servicesTotal}
            visitId={visit.id}
            total={visit.servicesTotal}
            canCredit={session.profile.role === "owner" || session.profile.role === "manager"}
            labPending={pendingLabs > 0}
          />
        </section>
      ) : visit.status === "done" ? (
        <section aria-labelledby="bill" className="grid gap-3 rounded-md border bg-card p-4">
          <h2 id="bill" className="text-lg font-bold">
            {t("billSummary")}
          </h2>
          <VisitReceipt
            tenantName={session.tenant.name}
            title={`${t("receiptTitle")} · ${tQueue("queueNo")} ${visit.queueNo}`}
            dateLabel={formatEthiopianDate(visit.closedAt ?? visit.visitDate, locale)}
            lines={lines.map((l) => ({ name: l.serviceName, qty: l.qty !== 1 ? `×${l.qty}` : "", amount: formatBirr(l.lineTotal, locale) }))}
            totals={[
              ...(visit.debtPosted > 0 ? [{ label: t("billCreditLabel"), amount: formatBirr(visit.debtPosted, locale) }] : []),
              ...payments.map((p) => ({
                label: `${t("billPaidLabel")} · ${p.method === "cash" || p.method === "telebirr" ? t(`billMethods.${p.method}`) : p.method}${p.reference ? ` ${p.reference}` : ""}`,
                amount: formatBirr(p.amount, locale),
              })),
              { label: t("total"), amount: formatBirr(visit.servicesTotal, locale) },
            ]}
            footer={`${visit.patient.fullName} · ${tQueue("cardNo")} ${visit.patient.cardNo}`}
          />
          <p className="text-sm text-muted-foreground">{t("closedNote")}</p>
        </section>
      ) : (
        <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">{t("closedNote")}</p>
      )}
    </div>
  );
}
