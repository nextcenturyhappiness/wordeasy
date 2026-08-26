import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PwaUpdateNotice } from "../../src/components/PwaUpdateNotice";
import { PWA_UPDATE_EVENT, type PwaUpdateDetail } from "../../src/pwa/updateCoordinator";

describe("PWA update notice", () => {
  it("offers a user-controlled update instead of forcing a reload", async () => {
    render(<PwaUpdateNotice />);

    window.dispatchEvent(
      new CustomEvent<PwaUpdateDetail>(PWA_UPDATE_EVENT, {
        detail: { status: "update-available", message: null }
      })
    );

    expect(await screen.findByRole("status")).toHaveTextContent("A new version is ready");
    expect(screen.getByRole("button", { name: "Update safely" })).toBeEnabled();
  });
});
