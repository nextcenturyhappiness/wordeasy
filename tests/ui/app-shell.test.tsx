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
                environmentNotice="Personal Mac edition · Progress is stored only on this Mac. Cloud backup and Android sync are not connected."
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
    expect(notice).toHaveTextContent("Android sync are not connected");
    expect(notice).not.toHaveTextContent("Preview");
  });
});
