"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { moveAppointment } from "@/actions/appointments";
import { Button } from "@/components/ui/button";

/** Check in (puts the patient in today's queue), mark a no-show, or cancel (second tap confirms). */
export function AppointmentActions({ bookingId, canCheckIn, canNoShow }: { bookingId: string; canCheckIn: boolean; canNoShow: boolean }) {
  const t = useTranslations("appointments");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = (status: "checked_in" | "cancelled" | "no_show") =>
    start(async () => {
      setError(null);
      const r = await moveAppointment({ bookingId, status });
      if (!r.ok) {
        setError(t(`errors.${r.code}` as "errors.generic"));
        return;
      }
      if (status === "checked_in" && r.visitId) router.push(`/visits/${r.visitId}`);
      else router.refresh();
    });

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {canCheckIn ? (
          <Button type="button" className="h-11" disabled={pending} onClick={() => run("checked_in")}>
            {t("checkIn")}
          </Button>
        ) : null}
        {canNoShow ? (
          <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={() => run("no_show")}>
            {t("noShow")}
          </Button>
        ) : null}
        <Button
          type="button"
          variant={confirming ? "destructive" : "ghost"}
          className="h-11"
          disabled={pending}
          onClick={() => (confirming ? run("cancelled") : setConfirming(true))}
          onBlur={() => setConfirming(false)}
        >
          {confirming ? t("confirmCancel") : t("cancelAppointment")}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
