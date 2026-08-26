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

function SettingsRoutes({ gateway }: { gateway: SettingsGateway }) {
  return (
    <Routes>
      <Route path="/settings" element={<SettingsPage gateway={gateway} />} />
      <Route path="/login" element={<h1>Signed-out login</h1>} />
    </Routes>
  );
}

describe("SettingsPage", () => {
  it("applies and persists manual Light/Dark/System preferences", async () => {
    const user = userEvent.setup();
    const settingsGateway = createSettingsGateway();
    renderWithAuthenticatedApp(<SettingsRoutes gateway={settingsGateway} />, {
      settingsGateway,
      initialTheme: "system",
      initialEntries: ["/settings"]
    });

    expect(await screen.findByRole("textbox", { name: "IANA timezone" })).toHaveValue(
      "Asia/Shanghai"
    );
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
  });

  it("rolls back the visible theme and reports a persistence error", async () => {
    const user = userEvent.setup();
    const settingsGateway = createSettingsGateway("light", "Asia/Shanghai", {
      setTheme: vi.fn<SettingsGateway["setTheme"]>(() =>
        Promise.reject(new Error("Local theme storage is unavailable."))
      )
    });
    renderWithAuthenticatedApp(<SettingsRoutes gateway={settingsGateway} />, {
      settingsGateway,
      initialTheme: "light",
      initialEntries: ["/settings"]
    });

    await screen.findByRole("textbox", { name: "IANA timezone" });
    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Local theme storage is unavailable."
    );
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(themeStorageKey)).toBe("light");
  });

  it("validates and saves an IANA timezone without changing existing assignments", async () => {
    const user = userEvent.setup();
    const settingsGateway = createSettingsGateway();
    renderWithAuthenticatedApp(<SettingsRoutes gateway={settingsGateway} />, {
      settingsGateway,
      initialEntries: ["/settings"]
    });

    const timezone = await screen.findByRole("textbox", { name: "IANA timezone" });
    await user.clear(timezone);
    await user.type(timezone, "not/a-zone");
    await user.click(screen.getByRole("button", { name: "Save timezone" }));
    expect(screen.getByRole("alert")).toHaveTextContent("valid IANA timezone");
    expect(settingsGateway.setTimezone).not.toHaveBeenCalled();

    await user.clear(timezone);
    await user.type(timezone, "America/New_York");
    await user.click(screen.getByRole("button", { name: "Save timezone" }));
    await waitFor(() => {
      expect(settingsGateway.setTimezone).toHaveBeenCalledWith("America/New_York");
    });
    expect(screen.getByText(/existing daily assignments stay unchanged/i)).toBeInTheDocument();
  });

  it("signs out while explicitly preserving cached data and unsynced outbox", async () => {
    const user = userEvent.setup();
    const authGateway = createAuthGateway();
    const settingsGateway = createSettingsGateway();
    renderWithAuthenticatedApp(<SettingsRoutes gateway={settingsGateway} />, {
      authGateway,
      settingsGateway,
      initialEntries: ["/settings"]
    });

    await screen.findByRole("textbox", { name: "IANA timezone" });
    expect(
      screen.getByText(/does not delete.*cached data or unsynced outbox/i)
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(authGateway.signOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("heading", { name: "Signed-out login" })).toBeInTheDocument();
  });

  it("has no automatically detectable accessibility violations", async () => {
    const settingsGateway = createSettingsGateway();
    const { container } = renderWithAuthenticatedApp(<SettingsRoutes gateway={settingsGateway} />, {
      settingsGateway,
      initialEntries: ["/settings"]
    });
    await screen.findByRole("textbox", { name: "IANA timezone" });

    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } }
    });
    expect(result.violations).toEqual([]);
  });
});
