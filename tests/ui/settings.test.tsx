import axe from "axe-core";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { SettingsGateway } from "../../src/application/contracts";
import { themeStorageKey } from "../../src/app/theme";
import { SettingsPage } from "../../src/routes/settings/SettingsPage";
import { createAuthGateway, createSettingsGateway } from "../auth/fixtures";
import { renderWithAuthenticatedApp } from "./fixtures";

function SettingsRoutes() {
  return (
    <Routes>
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/login" element={<h1>Signed-out login</h1>} />
    </Routes>
  );
}

function expectNoTimezoneEditor(): void {
  expect(screen.queryByRole("heading", { name: "Study timezone" })).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: "IANA timezone" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save timezone" })).not.toBeInTheDocument();
  expect(screen.queryByText(/example:\s*asia\/shanghai/i)).not.toBeInTheDocument();
  expect(
    screen.queryByText(/determines the date of future daily assignments/i)
  ).not.toBeInTheDocument();
}

describe("SettingsPage", () => {
  it("does not show a study timezone editor", async () => {
    const settingsGateway = createSettingsGateway();
    renderWithAuthenticatedApp(<SettingsRoutes />, {
      settingsGateway,
      initialEntries: ["/settings"]
    });

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expectNoTimezoneEditor();
    expect(settingsGateway.getTimezone).not.toHaveBeenCalled();
    expect(settingsGateway.setTimezone).not.toHaveBeenCalled();
  });

  it("applies and persists manual Light/Dark/System preferences", async () => {
    const user = userEvent.setup();
    const settingsGateway = createSettingsGateway();
    renderWithAuthenticatedApp(<SettingsRoutes />, {
      settingsGateway,
      initialTheme: "system",
      initialEntries: ["/settings"]
    });

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expectNoTimezoneEditor();
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    await waitFor(() => {
      expect(settingsGateway.setTheme).toHaveBeenCalledWith("dark");
    });
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(localStorage.getItem(themeStorageKey)).toBe("dark");

    await user.click(screen.getByRole("radio", { name: "Light" }));
    await waitFor(() => {
      expect(settingsGateway.setTheme).toHaveBeenLastCalledWith("light");
    });
    expect(document.documentElement.dataset.theme).toBe("light");

    await user.click(screen.getByRole("radio", { name: "System" }));
    await waitFor(() => {
      expect(settingsGateway.setTheme).toHaveBeenLastCalledWith("system");
    });
    expect(document.documentElement.dataset.theme).toBe("system");
    expect(document.documentElement.style.colorScheme).toBe("light dark");
    expect(settingsGateway.setTimezone).not.toHaveBeenCalled();
  });

  it("rolls back the visible theme and reports a persistence error", async () => {
    const user = userEvent.setup();
    const settingsGateway = createSettingsGateway("light", "Asia/Shanghai", {
      setTheme: vi.fn<SettingsGateway["setTheme"]>(() =>
        Promise.reject(new Error("Local theme storage is unavailable."))
      )
    });
    renderWithAuthenticatedApp(<SettingsRoutes />, {
      settingsGateway,
      initialTheme: "light",
      initialEntries: ["/settings"]
    });

    await screen.findByRole("heading", { name: "Settings" });
    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Local theme storage is unavailable."
    );
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(themeStorageKey)).toBe("light");
  });

  it("signs out while explicitly preserving cached data and unsynced outbox", async () => {
    const user = userEvent.setup();
    const authGateway = createAuthGateway();
    const settingsGateway = createSettingsGateway();
    renderWithAuthenticatedApp(<SettingsRoutes />, {
      authGateway,
      settingsGateway,
      initialEntries: ["/settings"]
    });

    await screen.findByRole("heading", { name: "Settings" });
    expectNoTimezoneEditor();
    expect(
      screen.getByText(/does not delete.*cached data or unsynced outbox/i)
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(authGateway.signOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("heading", { name: "Signed-out login" })).toBeInTheDocument();
  });

  it("has no automatically detectable accessibility violations", async () => {
    const settingsGateway = createSettingsGateway();
    const { container } = renderWithAuthenticatedApp(<SettingsRoutes />, {
      settingsGateway,
      initialEntries: ["/settings"]
    });
    await screen.findByRole("heading", { name: "Settings" });
    expectNoTimezoneEditor();

    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } }
    });
    expect(result.violations).toEqual([]);
  });
});
