import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/config";

/** Creates the clinic tenant and makes the caller its owner (core RPC `create_tenant`). */
export async function createClinicTenant(input: {
  name: string;
  fullName: string;
  phone: string;
  lang: Locale;
}): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_tenant", {
    p_name: input.name,
    p_vertical: "clinic",
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_lang: input.lang,
  });
  return { ok: !error };
}
