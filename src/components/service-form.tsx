"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { addService, type ServiceFormState } from "@/actions/services";
import { BirrInput } from "@/components/galmee/birr-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KINDS = ["consultation", "lab", "procedure", "other"] as const;

/** Adds one line to the clinic's price list. */
export function ServiceForm() {
  const t = useTranslations("services");
  const [state, action, pending] = useActionState<ServiceFormState, FormData>(addService, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const error = state?.error;

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={120}
          autoComplete="off"
          placeholder={t("namePlaceholder")}
          aria-invalid={error === "errorName" || error === "errorDuplicate" || undefined}
          aria-describedby={error ? "service-error" : undefined}
        />
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">{t("kind")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map((kind, i) => (
            <label
              key={kind}
              className="flex min-h-12 cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-2 leading-snug font-medium has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input type="radio" name="kind" value={kind} defaultChecked={i === 0} className="size-4 accent-primary" />
              {t(`kinds.${kind}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="price">{t("price")}</Label>
        <BirrInput
          id="price"
          name="price"
          required
          unitLabel={t("birr")}
          aria-invalid={error === "errorPrice" || undefined}
          aria-describedby={error ? "service-error" : undefined}
        />
      </div>
      <p id="service-error" role={error ? "alert" : "status"} className={error ? "text-sm font-medium text-destructive" : "text-sm text-money-in"}>
        {error ? t(error) : state?.ok ? t("added") : null}
      </p>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("saving") : t("add")}
      </Button>
    </form>
  );
}
