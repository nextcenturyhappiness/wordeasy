import { lazy } from "react";
import { Route, Routes } from "react-router-dom";

import { RouteNotice } from "../components/RouteNotice";
import { HomePage } from "../routes/home/HomePage";
import type { SettingsGateway } from "../application/contracts";
import { AuthGate } from "./AuthGate";
import { AppShell } from "./AppShell";
import {
  preloadLoginRoute,
  preloadSettingsRoute,
  preloadStudyRoute,
  preloadTodayRoute
} from "./lazyRoutes";

const TodayPage = lazy(preloadTodayRoute);
const StudyPage = lazy(preloadStudyRoute);
const LoginPage = lazy(preloadLoginRoute);
const SettingsPage = lazy(preloadSettingsRoute);

function NotFoundRoute() {
  return (
    <RouteNotice
      eyebrow="Page not found"
      title="This learning page does not exist."
      message="Return home to continue with an assigned module."
    />
  );
}

export function AppRoutes({
  settingsGateway,
  environmentNotice
}: {
  settingsGateway: SettingsGateway | null;
  environmentNotice?: string;
}) {
  const authenticationEnabled = settingsGateway !== null;

  return (
    <Routes>
      <Route
        element={
          <AppShell
            authenticationEnabled={authenticationEnabled}
            {...(environmentNotice === undefined ? {} : { environmentNotice })}
          />
        }
      >
        {authenticationEnabled ? (
          <>
            <Route path="login" element={<LoginPage />} />
            <Route element={<AuthGate />}>
              <Route index element={<HomePage />} />
              <Route path="today/:module" element={<TodayPage />} />
              <Route path="study/:module" element={<StudyPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFoundRoute />} />
          </>
        ) : (
          <>
            <Route index element={<HomePage />} />
            <Route path="today/:module" element={<TodayPage />} />
            <Route path="study/:module" element={<StudyPage />} />
            <Route path="*" element={<NotFoundRoute />} />
          </>
        )}
      </Route>
    </Routes>
  );
}
