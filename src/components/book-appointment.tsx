"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarPlus } from "lucide-react";
import { book } from "@/actions/appointments";
import { Sheet } from "@/components/galmee/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultLocale, isLocale } from "@/i18n/config";
import { APPOINTMENT_MINUTES } from "@/lib/appointments";
import { formatEthiopianDate } from "@/lib/ethiopian-date";

/** Reception books a patient in with a doctor; the database refuses a doctor's double booking. */
export function BookAppointment({
  patientId,
  doctors,
  today,
}: {
  patientId: string;
  doctors: { userId: string; fullName: string }[];
  today: string;
}) {
  const t = useTranslations("appointments");
  const rawLocale = useLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const [open, setOpen] = useState(false);
  const [doctorId, setDoctorId] = useState(doctors[0]?.userId ?? "");
  const [day, setDay] = useState(today);
  const [time, setTime] = useState("09:00");
  const [minutes, setMinutes] = useState<number>(15);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const validDay = /^\d{4}-\d{2}-\d{2}$/.test(day);

  if (doctors.length === 0) return <p className="text-sm text-muted-foreground">{t("noDoctors")}</p>;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full"
        onClick={() => {
          setError(null);
          setDone(null);
          setOpen(true);
        }}
      >
        <CalendarPlus aria-hidden />
        {t("book")}
      </Button>
      {done ? (
        <p role="status" className="text-sm font-medium">
          {done}
        </p>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title={t("book")} closeLabel={t("cancel")}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              setError(null);
              const r = await book({ patientId, doctorId, day, time, minutes, note });
              if (r.ok) {
                setDone(t("booked", { date: formatEthiopianDate(day, locale), time }));
                setNote("");
                setOpen(false);
              } else setError(t(`errors.${r.code}` as "errors.generic"));
            });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="ap-doctor">{t("doctor")}</Label>
            <select
              id="ap-doctor"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="h-12 rounded-md border bg-card px-3 text-base"
              required
            >
              {doctors.map((d) => (
                <option key={d.userId} value={d.userId}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="ap-day">{t("date")}</Label>
              <Input id="ap-day" type="date" min={today} value={day} onChange={(e) => setDay(e.target.value)} className="h-12" required />
            </div>
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="ap-time">{t("time")}</Label>
              <Input id="ap-time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} className="num h-12" required />
            </div>
          </div>
          {validDay ? (
            <p className="-mt-2 text-sm font-medium text-muted-foreground" aria-live="polite">
              {formatEthiopianDate(day, locale)}
            </p>
          ) : null}

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">{t("minutes")}</legend>
            <div className="grid grid-cols-4 gap-2">
              {APPOINTMENT_MINUTES.map((m) => (
                <label
                  key={m}
                  className="flex h-12 cursor-pointer items-center justify-center rounded-md border bg-card text-sm font-medium has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-2 has-focus-visible:ring-ring"
                >
                  <input type="radio" name="ap-minutes" value={m} checked={minutes === m} onChange={() => setMinutes(m)} className="sr-only" />
                  <span className="num">{t("minutesValue", { minutes: m })}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-2">
            <Label htmlFor="ap-note">{t("note")}</Label>
            <Input id="ap-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} aria-describedby="ap-note-hint" className="h-12" />
            <p id="ap-note-hint" className="text-xs text-muted-foreground">
              {t("noteHint")}
            </p>
          </div>

          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-12" disabled={pending || !doctorId}>
            {t("save")}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
