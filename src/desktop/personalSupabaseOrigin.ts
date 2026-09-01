export const PERSONAL_SUPABASE_PROJECT_REF = "kksllqgtjtfxfnknlrfn";
export const PERSONAL_SUPABASE_HTTPS_ORIGIN = `https://${PERSONAL_SUPABASE_PROJECT_REF}.supabase.co`;
export const PERSONAL_SUPABASE_WSS_ORIGIN = `wss://${PERSONAL_SUPABASE_PROJECT_REF}.supabase.co`;

export function normalizePublicSupabaseUrl(url: string): string {
  return url.trim().replace(/\/+$/u, "");
}

export function isPersonalSupabaseHttpsOrigin(url: string): boolean {
  return normalizePublicSupabaseUrl(url) === PERSONAL_SUPABASE_HTTPS_ORIGIN;
}

export function looksLikePrivilegedSupabaseKey(key: string): boolean {
  const privilegedRole = ["service", "role"].join("_");
  return new RegExp(privilegedRole, "iu").test(key) || /sb_secret_/u.test(key);
}

export function resolveDesktopCloudPublicEnv(environment: {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}): { url: string; publishableKey: string } {
  const url = environment.VITE_SUPABASE_URL?.trim();
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (
    url === undefined ||
    url.length === 0 ||
    publishableKey === undefined ||
    publishableKey.length === 0
  ) {
    throw new Error(
      "Desktop builds require VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from local .env / CI secrets, the same public env as the cloud web build."
    );
  }
  if (!isPersonalSupabaseHttpsOrigin(url)) {
    throw new Error(
      `Desktop builds must use the personal Supabase origin ${PERSONAL_SUPABASE_HTTPS_ORIGIN}.`
    );
  }
  if (looksLikePrivilegedSupabaseKey(publishableKey)) {
    throw new Error("Desktop builds must not include a privileged Supabase credential.");
  }
  return { url: normalizePublicSupabaseUrl(url), publishableKey };
}
