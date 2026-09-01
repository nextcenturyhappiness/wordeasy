import { describe, expect, it } from "vitest";

import {
  PERSONAL_SUPABASE_HTTPS_ORIGIN,
  looksLikePrivilegedSupabaseKey,
  resolveDesktopCloudPublicEnv
} from "../../src/desktop/personalSupabaseOrigin";

describe("desktop cloud public environment", () => {
  it("requires the personal Supabase origin and a non-privileged publishable key", () => {
    expect(
      resolveDesktopCloudPublicEnv({
        VITE_SUPABASE_URL: `${PERSONAL_SUPABASE_HTTPS_ORIGIN}/`,
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_desktop_test"
      })
    ).toEqual({
      url: PERSONAL_SUPABASE_HTTPS_ORIGIN,
      publishableKey: "sb_publishable_desktop_test"
    });
  });

  it("refuses a missing public configuration", () => {
    expect(() => resolveDesktopCloudPublicEnv({})).toThrow(
      "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY"
    );
  });

  it("refuses a different Supabase project", () => {
    expect(() =>
      resolveDesktopCloudPublicEnv({
        VITE_SUPABASE_URL: "https://another-project.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_desktop_test"
      })
    ).toThrow("personal Supabase origin");
  });

  it("refuses a privileged Supabase credential", () => {
    expect(looksLikePrivilegedSupabaseKey("sb_secret_desktop_must_never_ship")).toBe(true);
    expect(() =>
      resolveDesktopCloudPublicEnv({
        VITE_SUPABASE_URL: PERSONAL_SUPABASE_HTTPS_ORIGIN,
        VITE_SUPABASE_PUBLISHABLE_KEY: ["service", "role", "placeholder"].join("_")
      })
    ).toThrow("privileged Supabase credential");
  });
});
