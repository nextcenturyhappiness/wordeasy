import type { ModuleRouteParam, ModuleSlug } from "../application/contracts";

const routeModules: Record<ModuleRouteParam, ModuleSlug> = {
  research: "research_english",
  medical: "medical_english",
  essential: "essential_medical"
};

const moduleRoutes: Record<ModuleSlug, ModuleRouteParam> = {
  research_english: "research",
  medical_english: "medical",
  essential_medical: "essential"
};

const moduleNames: Record<ModuleSlug, string> = {
  research_english: "Research English",
  medical_english: "Medical English",
  essential_medical: "必备医学英语"
};

const CLOUD_MODULE_ORDER = [
  "research_english",
  "medical_english",
  "essential_medical"
] as const satisfies readonly ModuleSlug[];

const LOCAL_MODULE_ORDER = [
  "research_english",
  "medical_english"
] as const satisfies readonly ModuleSlug[];

export function isLocalTwoModuleSurface(
  appMode: string | undefined = import.meta.env.VITE_APP_MODE
): boolean {
  return appMode === "desktop" || appMode === "standalone";
}

export function homeModuleOrder(
  appMode: string | undefined = import.meta.env.VITE_APP_MODE
): readonly ModuleSlug[] {
  return isLocalTwoModuleSurface(appMode) ? LOCAL_MODULE_ORDER : CLOUD_MODULE_ORDER;
}

export function parseModuleRoute(
  value: string | undefined,
  appMode: string | undefined = import.meta.env.VITE_APP_MODE
): ModuleSlug | null {
  if (value === "research" || value === "medical" || value === "essential") {
    const module = routeModules[value];
    if (module === "essential_medical" && isLocalTwoModuleSurface(appMode)) {
      return null;
    }
    return module;
  }

  return null;
}

export function getModuleRoute(module: ModuleSlug): ModuleRouteParam {
  return moduleRoutes[module];
}

export function getModuleName(module: ModuleSlug): string {
  return moduleNames[module];
}

export function lexiconLookupHref(module: ModuleSlug, cardId: string): string {
  return `/study/${getModuleRoute(module)}?card=${encodeURIComponent(cardId)}`;
}
