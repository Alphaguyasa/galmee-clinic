"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageSquareText } from "lucide-react";
import { sendReminders } from "@/actions/appointments";
import { Button } from "@/components/ui/button";

/** One press texts every booked patient of the day who has a phone and has not been texted yet. */
export function SendReminders({ day, waiting }: { day: string; waiting: number }) {
  const t = useTranslations("appointments.reminders");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  return (
    <div className="grid gap-2 rounded-md border bg-card p-3">
      <p className="text-sm">{waiting > 0 ? t("waiting", { count: waiting }) : t("allSent")}</p>
      {waiting > 0 ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await sendReminders(day);
              setFailed(!r.ok);
              setMessage(
                r.ok
                  ? [t("queued", { count: r.queued }), r.noPhone > 0 ? t("noPhone", { count: r.noPhone }) : null].filter(Boolean).join(" ")
                  : t(r.code === "notAllowed" ? "notAllowed" : "error"),
              );
              if (r.ok) router.refresh();
            })
          }
        >
          <MessageSquareText aria-hidden />
          {t("send")}
        </Button>
      ) : null}
      {message ? (
        <p role={failed ? "alert" : "status"} className={failed ? "text-sm font-medium text-destructive" : "text-sm font-medium"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
