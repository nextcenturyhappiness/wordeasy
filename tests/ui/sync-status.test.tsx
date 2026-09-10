import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { shortenSyncFailureReason, SyncStatus } from "../../src/components/SyncStatus";

describe("SyncStatus", () => {
  it("keeps a failed status without a message as Sync failed", () => {
    render(<SyncStatus state={{ status: "failed", pendingCount: 0, message: "" }} />);

    expect(screen.getByRole("status")).toHaveTextContent("Sync failed");
    expect(screen.getByRole("status")).not.toHaveTextContent("·");
  });

  it("surfaces a short failure reason when sync failed", () => {
    render(
      <SyncStatus
        state={{
          status: "failed",
          pendingCount: 2,
          message: "Cloud day cache refresh failed for every module."
        }}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Sync failed · 2 changes pending · Cloud day cache refresh failed for every module."
    );
  });

  it("shortens a long English failure reason without translating it", () => {
    const reason = shortenSyncFailureReason(
      "  Cloud day cache refresh failed for every module (research_english: unavailable; medical_english: unavailable; essential_medical: unavailable).  "
    );

    expect(reason.startsWith("Cloud day cache refresh failed")).toBe(true);
    expect(reason.length).toBeLessThanOrEqual(96);
    expect(reason.endsWith("…")).toBe(true);
  });
});
