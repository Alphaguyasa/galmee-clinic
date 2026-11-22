import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarCheck, CalendarClock, CalendarDays, CalendarX, ChevronLeft, ChevronRight } from "lucide-react";
import { AppointmentActions } from "@/components/appointment-actions";
import { SendReminders } from "@/components/send-reminders";
import { EmptyState } from "@/components/galmee/empty-state";
import { ListSheet } from "@/components/galmee/list-row";
import { StatusBadge } from "@/components/galmee/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { defaultLocale, isLocale } from "@/i18n/config";
import { clinicClock, groupByDoctor, pickAppointmentDay, type AppointmentStatus } from "@/lib/appointments";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { shiftDay } from "@/lib/income";
import { cn } from "@/lib/utils";
import { getAppointmentsForDay, listDoctors, remindedBookings } from "@/server/dal/appointments";
import { getClinicalRoles } from "@/server/dal/clinical-roles";
import { getSession } from "@/server/dal/session";
import { clinicToday } from "@/server/dal/visits";

export const dynamic = "force-dynamic";

const BADGE: Record<AppointmentStatus, { tone: "ok" | "sync" | "neutral" | "warn"; icon: typeof CalendarClock; key: string }> = {
  booked: { tone: "sync", icon: CalendarClock, key: "statusBooked" },
  checked_in: { tone: "ok", icon: CalendarCheck, key: "statusCheckedIn" },
  done: { tone: "ok", icon: CalendarCheck, key: "statusDone" },
  no_show: { tone: "warn", icon: CalendarX, key: "statusNoShow" },
  cancelled: { tone: "neutral", icon: CalendarX, key: "statusBooked" },
};

/** One day of appointments, doctor by doctor, with check-in for today's. */
export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const today = clinicToday();
  const day = pickAppointmentDay((await searchParams).d, today);
  const [rows, doctors, session, roles, t, rawLocale] = await Promise.all([
    getAppointmentsForDay(day),
    listDoctors(),
    getSession(),
    getClinicalRoles(),
    getTranslations("appointments"),
    getLocale(),
  ]);
  const booked = rows.filter((r) => r.status === "booked");
  const reminded = await remindedBookings(booked.map((r) => r.id));
  // Reminders go out for today or tomorrow only; reception, the owner and managers send them.
  const canRemind =
    (day === today || day === shiftDay(today, 1)) &&
    (session.profile.role !== "staff" || roles.has("reception"));
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const names = new Map(doctors.map((d) => [d.userId, d.fullName]));
  const groups = groupByDoctor(rows, names);
  const isToday = day === today;
  const now = new Date().toISOString();

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5 *:min-w-0">
      <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>

      <nav aria-label={t("pickDay")} className="flex items-center justify-between gap-2 rounded-md border bg-card p-1">
        <Link
          href={`/appointments?d=${shiftDay(day, -1)}`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11")}
          aria-label={t("previousDay")}
        >
          <ChevronLeft aria-hidden />
        </Link>
        <p className="text-center font-semibold">
          {formatEthiopianDate(day, locale)}
          {isToday ? (
            <span className="block text-xs font-normal text-muted-foreground">{t("today")}</span>
          ) : (
            <Link href="/appointments" className="block text-xs font-medium text-primary">
              {t("today")}
            </Link>
          )}
        </p>
        <Link
          href={`/appointments?d=${shiftDay(day, 1)}`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11")}
          aria-label={t("nextDay")}
        >
          <ChevronRight aria-hidden />
        </Link>
      </nav>

      {doctors.length === 0 ? <p className="text-sm text-muted-foreground">{t("noDoctors")}</p> : null}

      {canRemind && booked.length > 0 ? (
        <SendReminders day={day} waiting={booked.filter((r) => !reminded.has(r.id)).length} />
      ) : null}

      {groups.length === 0 ? (
        <EmptyState icon={CalendarDays} message={t("empty")} />
      ) : (
        groups.map((g) => (
          <section key={g.doctorId} aria-labelledby={`dr-${g.doctorId}`} className="grid gap-2">
            <h2 id={`dr-${g.doctorId}`} className="text-lg font-bold break-words">
              {g.doctorName}
            </h2>
            <ListSheet>
              {g.rows.map((r) => {
                const badge = BADGE[r.status];
                return (
                  <li key={r.id} className="grid gap-2 p-3">
                    <div className="flex items-start gap-3">
                      <p className="num w-14 shrink-0 pt-0.5 text-lg font-bold">{clinicClock(r.startsAt)}</p>
                      <div className="grid min-w-0 flex-1 gap-0.5">
                        {r.patientId ? (
                          <Link href={`/patients/${r.patientId}`} prefetch={false} className="font-semibold break-words text-primary underline-offset-4 hover:underline">
                            {r.fullName}
                          </Link>
                        ) : (
                          <p className="font-semibold">{t("unknownPatient")}</p>
                        )}
                        <p className="num text-sm text-muted-foreground">
                          #{r.cardNo ?? "—"} · <span className="whitespace-nowrap">{clinicClock(r.startsAt)}–{clinicClock(r.endsAt)}</span>
                        </p>
                        {r.note ? <p className="text-sm break-words">{r.note}</p> : null}
                        {reminded.has(r.id) ? <p className="text-xs text-muted-foreground">{t("reminders.sent")}</p> : null}
                      </div>
                      <StatusBadge tone={badge.tone} icon={badge.icon}>
                        {t(badge.key)}
                      </StatusBadge>
                    </div>
                    {r.status === "booked" ? (
                      <AppointmentActions bookingId={r.id} canCheckIn={isToday && r.patientId !== null} canNoShow={r.startsAt <= now} />
                    ) : null}
                  </li>
                );
              })}
            </ListSheet>
          </section>
        ))
      )}
    </div>
  );
}
