/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module "virtual:article-english-demo-seed" {
  const cards: unknown[];
  export default cards;
}

interface ImportMetaEnv {
  readonly VITE_APP_MODE?: "demo" | "preview" | "cloud";
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
