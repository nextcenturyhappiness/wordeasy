import { afterEach, describe, expect, it } from "vitest";

import {
  FALLBACK_SYSTEM_TIMEZONE,
  calculateStreak,
  setSystemTimezoneResolver,
  studyDateFor,
  systemIanaTimezone
} from "../../src/domain/time";

afterEach(() => {
  setSystemTimezoneResolver(null);
});

describe("system IANA study dates", () => {
  it("derives study_date from an IANA zone rather than the UTC date", () => {
    const instant = new Date("2026-08-26T16:30:00.000Z");
    expect(studyDateFor(instant, "Asia/Shanghai")).toBe("2026-08-27");
    expect(studyDateFor(instant, "America/Los_Angeles")).toBe("2026-08-26");
  });

  it("uses a mockable OS IANA timezone for studyDateFor and streak as-of dates", () => {
    setSystemTimezoneResolver(() => "America/New_York");
    const timezone = systemIanaTimezone();
    expect(timezone).toBe("America/New_York");
    expect(studyDateFor(new Date("2026-08-26T16:30:00.000Z"), timezone)).toBe("2026-08-26");
    expect(
      calculateStreak(
        ["2026-08-25", "2026-08-26"],
        studyDateFor(new Date("2026-08-26T16:30:00.000Z"), timezone)
      )
    ).toBe(2);

    setSystemTimezoneResolver(() => "Asia/Shanghai");
    expect(studyDateFor(new Date("2026-08-26T16:30:00.000Z"), systemIanaTimezone())).toBe(
      "2026-08-27"
    );
  });

  it("falls back to UTC when the OS timezone cannot be resolved", () => {
    setSystemTimezoneResolver(() => "");
    expect(systemIanaTimezone()).toBe(FALLBACK_SYSTEM_TIMEZONE);
    setSystemTimezoneResolver(() => "not/a-zone");
    expect(systemIanaTimezone()).toBe(FALLBACK_SYSTEM_TIMEZONE);
    expect(studyDateFor(new Date("2026-08-26T16:30:00.000Z"), systemIanaTimezone())).toBe(
      "2026-08-26"
    );
  });

  it("changes the study date exactly at IANA-local midnight", () => {
    expect(studyDateFor(new Date("2026-08-26T15:59:59.999Z"), "Asia/Shanghai")).toBe("2026-08-26");
    expect(studyDateFor(new Date("2026-08-26T16:00:00.000Z"), "Asia/Shanghai")).toBe("2026-08-27");
  });

  it("keeps a stable calendar date through DST spring-forward and fall-back", () => {
    expect(studyDateFor(new Date("2026-03-08T06:59:59.000Z"), "America/New_York")).toBe(
      "2026-03-08"
    );
    expect(studyDateFor(new Date("2026-03-08T07:00:00.000Z"), "America/New_York")).toBe(
      "2026-03-08"
    );
    expect(studyDateFor(new Date("2026-11-01T05:30:00.000Z"), "America/New_York")).toBe(
      "2026-11-01"
    );
    expect(studyDateFor(new Date("2026-11-01T06:30:00.000Z"), "America/New_York")).toBe(
      "2026-11-01"
    );
  });

  it("counts distinct consecutive IANA-local study days", () => {
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
