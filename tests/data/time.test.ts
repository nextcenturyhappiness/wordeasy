import { describe, expect, it } from "vitest";

import { calculateStreak, studyDateFor } from "../../src/domain/time";

describe("profile-local study dates", () => {
  it("derives study_date from the saved IANA timezone rather than the UTC date", () => {
    const instant = new Date("2026-08-26T16:30:00.000Z");
    expect(studyDateFor(instant, "Asia/Shanghai")).toBe("2026-08-27");
    expect(studyDateFor(instant, "America/Los_Angeles")).toBe("2026-08-26");
  });

  it("counts distinct consecutive profile-local study days", () => {
    expect(
      calculateStreak(["2026-08-24", "2026-08-25", "2026-08-25", "2026-08-26"], "2026-08-26")
    ).toBe(3);
    expect(calculateStreak(["2026-08-20", "2026-08-25", "2026-08-26"], "2026-08-26")).toBe(2);
  });

  it("keeps yesterday's active streak but expires an older one", () => {
    expect(calculateStreak(["2026-08-24", "2026-08-25"], "2026-08-26")).toBe(2);
    expect(calculateStreak(["2026-08-23", "2026-08-24"], "2026-08-26")).toBe(0);
    expect(calculateStreak(["2026-08-26", "2026-08-27"], "2026-08-26")).toBe(1);
  });
});
