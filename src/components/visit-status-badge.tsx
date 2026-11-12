import { useTranslations } from "next-intl";
import { CircleCheck, Clock, FlaskConical, Stethoscope } from "lucide-react";
import { StatusBadge } from "@/components/galmee/status-badge";
import type { VisitStatus } from "@/lib/visit-status";

const LOOK = {
  waiting: { icon: Clock, tone: "neutral" },
  with_doctor: { icon: Stethoscope, tone: "sync" },
  lab: { icon: FlaskConical, tone: "warn" },
  done: { icon: CircleCheck, tone: "ok" },
  cancelled: { icon: Clock, tone: "neutral" },
} as const;

/** Queue status as icon plus word, never colour alone. */
export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  const t = useTranslations("queue.status");
  const { icon, tone } = LOOK[status];
  return (
    <StatusBadge tone={tone} icon={icon}>
      {t(status)}
    </StatusBadge>
  );
}
