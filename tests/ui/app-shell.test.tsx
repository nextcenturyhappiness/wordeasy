import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { AppShell } from "../../src/app/AppShell";

afterEach(cleanup);

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
    expect(screen.getByRole("link", { name: "wordeasy home" })).toHaveTextContent("wordeasy");
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("describes the formal personal edition without presenting it as a preview", () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route
            element={
              <AppShell
                authenticationEnabled={false}
                environmentNotice="Personal Mac edition · Same cloud account as the browser. Progress is saved on this Mac first; sync happens in the background and never blocks learning."
              />
            }
          >
            <Route index element={<h1>Personal home</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const notice = screen.getByRole("status", { name: "Deployment status" });
    expect(notice).toHaveTextContent("Personal Mac edition");
    expect(notice).toHaveTextContent("Same cloud account as the browser");
    expect(notice).toHaveTextContent("never blocks learning");
    expect(notice).not.toHaveTextContent("Preview");
    expect(notice).not.toHaveTextContent("stored only on this Mac");
  });
});
