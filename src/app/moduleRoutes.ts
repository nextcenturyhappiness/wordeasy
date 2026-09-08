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

export function parseModuleRoute(value: string | undefined): ModuleSlug | null {
  if (value === "research" || value === "medical" || value === "essential") {
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
