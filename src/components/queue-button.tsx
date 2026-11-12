"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { addToQueue } from "@/actions/visits";
import { Button } from "@/components/ui/button";

/** Puts a patient in today's queue. One client reference per button, so a double tap opens one visit. */
export function QueueButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const t = useTranslations("queue");
  const [clientRef] = useState(() => crypto.randomUUID());
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid justify-items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        aria-label={t("addFor", { name: patientName })}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await addToQueue({ patientId, clientRef });
            if (!result.ok && result.code !== "alreadyOpen") setError(t("addError"));
          })
        }
      >
        <Plus aria-hidden />
        {pending ? t("adding") : t("addShort")}
      </Button>
      {error ? (
        <p role="alert" className="max-w-40 text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
