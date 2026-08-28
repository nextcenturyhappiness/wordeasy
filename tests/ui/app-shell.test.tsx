import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AppShell } from "../../src/app/AppShell";

describe("AppShell deployment notice", () => {
  it("keeps the local-only preview boundary visible", () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route
            element={
              <AppShell
                authenticationEnabled={false}
                environmentNotice="Preview mode · Progress stays in this browser. Sign-in and cross-device sync are not connected yet."
              />
            }
          >
            <Route index element={<h1>Preview home</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("status", { name: "Deployment status" })).toHaveTextContent(
      "Progress stays in this browser"
    );
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });
});
