"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { addPatient, type PatientFormState } from "@/actions/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Register a patient. The client reference makes a double tap create one patient, not two. */
export function PatientForm() {
  const t = useTranslations("patients");
  const [clientRef] = useState(() => crypto.randomUUID());
  const [state, action, pending] = useActionState<PatientFormState, FormData>(addPatient, undefined);
  const error = state?.error;

  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="clientRef" value={clientRef} />
      <div className="grid gap-2">
        <Label htmlFor="fullName">{t("fullName")}</Label>
        <Input
          id="fullName"
          name="fullName"
          required
          minLength={2}
          maxLength={120}
          autoComplete="off"
          aria-invalid={error === "errorName" || undefined}
          aria-describedby={error === "errorName" ? "form-error" : undefined}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">
          {t("phone")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="09…"
          aria-invalid={error === "errorPhone" || undefined}
          aria-describedby={error === "errorPhone" ? "form-error" : undefined}
        />
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">
          {t("sex")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(["female", "male"] as const).map((sex) => (
            <label
              key={sex}
              className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md border bg-card font-medium has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input type="radio" name="sex" value={sex} className="size-4 accent-primary" />
              {t(sex)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="age">
          {t("age")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
        </Label>
        <Input
          id="age"
          name="age"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={3}
          autoComplete="off"
          className="num max-w-32"
          aria-invalid={error === "errorAge" || undefined}
          aria-describedby={error === "errorAge" ? "form-error" : undefined}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="address">
          {t("address")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
        </Label>
        <Input id="address" name="address" maxLength={200} autoComplete="off" />
      </div>
      {error ? (
        <p id="form-error" role="alert" className="text-sm font-medium text-destructive">
          {t(error)}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("saving") : t("register")}
      </Button>
    </form>
  );
}
