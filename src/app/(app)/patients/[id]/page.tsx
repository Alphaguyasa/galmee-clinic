import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, CalendarClock, ClipboardList, FlaskConical } from "lucide-react";
import { z } from "zod";
import { CardNoTab } from "@/components/card-no-tab";
import { EmptyState } from "@/components/galmee/empty-state";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
import { MoneySummaryCard } from "@/components/galmee/money-summary-card";
import { StatusBadge } from "@/components/galmee/status-badge";
import { QueueButton } from "@/components/queue-button";
import { VisitStatusBadge } from "@/components/visit-status-badge";
import { defaultLocale, isLocale } from "@/i18n/config";
import { ageInYears } from "@/lib/age";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr } from "@/lib/money";
import { OPEN_STATUSES } from "@/lib/visit-status";
import { getClinicalRoles } from "@/server/dal/clinical-roles";
import { getCardLabs, getCardVisits, getStatement, openPatientCard } from "@/server/dal/patient-card";
import { PayBalance } from "@/components/pay-balance";
import { BookAppointment } from "@/components/book-appointment";
import { clinicClock, clinicDayOf } from "@/lib/appointments";
import { getUpcomingForPatient, listDoctors } from "@/server/dal/appointments";
import { clinicToday } from "@/server/dal/visits";

// Every opening of a card is logged, so the page is always rendered fresh.
export const dynamic = "force-dynamic";

export default async function PatientCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const patient = await openPatientCard(id);
  if (!patient) notFound();

  const today = clinicToday();
  const [roles, visits, statement, upcoming, doctors, t, tPatients, tQueue, tLab, tAppt, rawLocale] = await Promise.all([
    getClinicalRoles(),
    getCardVisits(id),
    getStatement(patient.customerId),
    getUpcomingForPatient(patient.customerId, today),
    listDoctors(),
    getTranslations("card"),
    getTranslations("patients"),
    getTranslations("queue"),
    getTranslations("lab"),
    getTranslations("appointments"),
    getLocale(),
  ]);
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const isDoctor = roles.has("doctor");
  const seesLabs = isDoctor || roles.has("lab");
  const labs = seesLabs ? await getCardLabs(id) : [];
  const openVisit = visits.find((v) => (OPEN_STATUSES as readonly string[]).includes(v.status));

  const details = [
    patient.sex ? tPatients(patient.sex) : null,
    patient.birthDate ? tPatients("ageYears", { age: ageInYears(patient.birthDate) }) : null,
    patient.address,
  ].filter(Boolean);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6 *:min-w-0">
      <Link href="/patients" className="inline-flex h-11 items-center gap-2 text-sm font-medium text-primary">
        <ArrowLeft className="size-4" aria-hidden />
        {tPatients("backToSearch")}
      </Link>

      <header className="grid gap-2">
        <CardNoTab cardNo={patient.cardNo} label={tPatients("cardNo")} className="w-fit" />
        <h1 className="text-[1.5625rem] leading-tight font-bold break-words">{patient.fullName}</h1>
        {patient.phone ? (
          <p className="num">
            <a href={`tel:${patient.phone}`} className="font-medium text-primary underline-offset-4 hover:underline">
              {patient.phone}
            </a>
          </p>
        ) : null}
        {details.length > 0 ? <p className="text-sm text-muted-foreground">{details.join(" · ")}</p> : null}
        <p className="text-sm text-muted-foreground">
          {t("registeredOn", { date: formatEthiopianDate(patient.registeredAt, locale) })}
        </p>
        <div className="pt-1">
          {openVisit ? (
            <Link href={`/visits/${openVisit.id}`} className="inline-flex">
              <StatusBadge tone="sync" icon={ClipboardList}>
                {tQueue("inQueue", { queueNo: openVisit.queueNo })}
              </StatusBadge>
            </Link>
          ) : (
            <QueueButton patientId={patient.id} patientName={patient.fullName} />
          )}
        </div>
      </header>

      <section aria-labelledby="appointments" className="grid gap-2">
        <h2 id="appointments" className="text-lg font-bold">
          {tAppt("upcoming")}
        </h2>
        {upcoming.length > 0 ? (
          <ListSheet>
            {upcoming.map((a) => (
              <ListRow
                key={a.id}
                href={`/appointments?d=${clinicDayOf(a.startsAt)}`}
                mark={<CalendarClock className="size-5 text-sync" aria-hidden />}
                title={formatEthiopianDate(clinicDayOf(a.startsAt), locale)}
                sub={
                  <>
                    <span className="num">{clinicClock(a.startsAt)}</span>
                    <span>{tAppt("withDoctor", { name: doctors.find((d) => d.userId === a.doctorId)?.fullName ?? "—" })}</span>
                    {a.note ? <span className="break-words">{a.note}</span> : null}
                  </>
                }
              />
            ))}
          </ListSheet>
        ) : null}
        <BookAppointment patientId={patient.id} doctors={doctors} today={today} />
      </section>

      <MoneySummaryCard
        label={t("balance")}
        figure={formatBirr(Math.max(patient.balance, 0), locale)}
        sub={patient.balance > 0 ? t("balanceOwed") : t("balanceClear")}
        tone={patient.balance > 0 ? "owed" : "band"}
        size="md"
      />

      {patient.balance > 0 ? <PayBalance key={patient.balance} patientId={patient.id} owed={patient.balance} /> : null}

      {statement.length > 0 ? (
        <details className="rounded-md border bg-card">
          <summary className="flex min-h-12 cursor-pointer items-center px-3 font-semibold">
            {t("statement", { count: statement.length })}
          </summary>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-1 font-medium">{t("statementDate")}</th>
                <th className="px-1 py-1 text-right font-medium">{t("statementAmount")}</th>
                <th className="px-3 py-1 text-right font-medium">{t("statementBalance")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...statement].reverse().map((l, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">
                    {formatEthiopianDate(l.at, locale, { withEra: false })}
                    <span className="block text-xs text-muted-foreground">{l.type === "debt" ? t("lineDebt") : t("lineRepayment")}</span>
                  </td>
                  <td className={l.type === "debt" ? "num px-1 py-2 text-right whitespace-nowrap text-owed" : "num px-1 py-2 text-right whitespace-nowrap text-money-in"}>
                    {l.type === "debt" ? "+" : "−"}
                    {formatBirr(l.amount, locale)}
                  </td>
                  <td className="num px-3 py-2 text-right font-semibold whitespace-nowrap">{formatBirr(l.balanceAfter, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}

      <section aria-labelledby="visits" className="grid gap-2">
        <h2 id="visits" className="text-lg font-bold">
          {t("visits", { count: visits.length })}
        </h2>
        {visits.length === 0 ? (
          <EmptyState icon={ClipboardList} message={t("noVisits")} />
        ) : (
          <ListSheet>
            {visits.map((v) => (
              <ListRow
                key={v.id}
                href={`/visits/${v.id}`}
                title={formatEthiopianDate(v.visitDate, locale)}
                sub={
                  <>
                    <span>{v.services.length > 0 ? v.services.join(", ") : t("noServices")}</span>
                    {isDoctor && v.notes?.diagnosis ? (
                      <span className="text-foreground">
                        <span className="font-semibold">{t("diagnosis")}:</span> {v.notes.diagnosis}
                      </span>
                    ) : isDoctor && v.notes?.complaint ? (
                      <span className="text-foreground">
                        <span className="font-semibold">{t("complaint")}:</span> {v.notes.complaint}
                      </span>
                    ) : null}
                    {isDoctor && v.notes?.treatment ? (
                      <span>
                        <span className="font-semibold">{t("treatment")}:</span> {v.notes.treatment}
                      </span>
                    ) : null}
                  </>
                }
                right={
                  <>
                    <span className="num font-semibold">{formatBirr(v.servicesTotal, locale)}</span>
                    {v.status !== "done" ? <VisitStatusBadge status={v.status} /> : null}
                  </>
                }
              />
            ))}
          </ListSheet>
        )}
      </section>

      {seesLabs ? (
        <section aria-labelledby="labs" className="grid gap-2">
          <h2 id="labs" className="text-lg font-bold">
            {t("labs")}
          </h2>
          {labs.length === 0 ? (
            <EmptyState icon={FlaskConical} message={t("noLabs")} />
          ) : (
            labs.map((o) => (
              <article key={o.id} className="grid gap-2 rounded-md border bg-card p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold break-words">{o.testName}</h3>
                  <span className="text-sm text-muted-foreground">{formatEthiopianDate(o.requestedAt, locale)}</span>
                </div>
                {o.status === "requested" ? (
                  <div>
                    <StatusBadge tone="warn" icon={FlaskConical}>
                      {t("labWaiting")}
                    </StatusBadge>
                  </div>
                ) : o.results.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noResults")}</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-1 pr-2 font-medium">{tLab("analyte")}</th>
                        <th className="py-1 pr-2 font-medium">{tLab("value")}</th>
                        <th className="py-1 font-medium">{tLab("range")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {o.results.map((r) => (
                        <tr key={r.analyte}>
                          <td className="py-2 pr-2 break-words">{r.analyte}</td>
                          <td className="num py-2 pr-2 font-semibold break-words">
                            {r.value}
                            {r.unit ? ` ${r.unit}` : ""}
                            {r.flag && r.flag !== "normal" ? (
                              <span className="ml-1 rounded-sm bg-warning/15 px-1 text-xs text-warning">
                                {tLab(`flags.${r.flag}`)}
                              </span>
                            ) : null}
                          </td>
                          <td className="num py-2 break-words text-muted-foreground">{r.referenceRange}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </article>
            ))
          )}
        </section>
      ) : null}

      <p className="text-xs text-muted-foreground">{t("loggedNote")}</p>
    </div>
  );
}
