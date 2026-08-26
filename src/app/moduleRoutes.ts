import type { ModuleRouteParam, ModuleSlug } from "../application/contracts";

const routeModules: Record<ModuleRouteParam, ModuleSlug> = {
  research: "research_english",
  medical: "medical_english"
};

const moduleRoutes: Record<ModuleSlug, ModuleRouteParam> = {
  research_english: "research",
  medical_english: "medical"
};

const moduleNames: Record<ModuleSlug, string> = {
  research_english: "Research English",
  medical_english: "Medical English"
};

export function parseModuleRoute(value: string | undefined): ModuleSlug | null {
  if (value === "research" || value === "medical") {
    return routeModules[value];
  }

  return null;
}

export function getModuleRoute(module: ModuleSlug): ModuleRouteParam {
  return moduleRoutes[module];
}

export function getModuleName(module: ModuleSlug): string {
  return moduleNames[module];
}
