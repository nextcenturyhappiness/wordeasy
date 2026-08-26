import { lazy } from "react";
import { Route, Routes } from "react-router-dom";

import { RouteNotice } from "../components/RouteNotice";
import { HomePage } from "../routes/home/HomePage";
import { AppShell } from "./AppShell";
import { preloadStudyRoute, preloadTodayRoute } from "./lazyRoutes";

const TodayPage = lazy(preloadTodayRoute);
const StudyPage = lazy(preloadStudyRoute);

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="today/:module" element={<TodayPage />} />
        <Route path="study/:module" element={<StudyPage />} />
        <Route
          path="*"
          element={
            <RouteNotice
              eyebrow="Page not found"
              title="This learning page does not exist."
              message="Return home to continue with an assigned module."
            />
          }
        />
      </Route>
    </Routes>
  );
}
