import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { PatientForm } from "@/components/patient-form";
import { getSession } from "@/server/dal/session";

export default async function NewPatientPage() {
  const [, t] = await Promise.all([getSession(), getTranslations("patients")]);
  return (
    <div className="mx-auto grid w-full max-w-md gap-6">
      <Link href="/patients" className="inline-flex h-11 items-center gap-2 text-sm font-medium text-primary">
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToSearch")}
      </Link>
      <div className="grid gap-1">
        <h1 className="text-[1.5625rem] leading-tight font-bold">{t("newTitle")}</h1>
        <p className="text-muted-foreground">{t("newIntro")}</p>
      </div>
      <PatientForm />
    </div>
  );
}
