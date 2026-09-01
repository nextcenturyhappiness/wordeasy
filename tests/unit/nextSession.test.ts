import { describe, expect, it } from "vitest";

import { selectNextSession } from "../../src/app/nextSession";
import { buildHomeSnapshot } from "../ui/fixtures";

describe("selectNextSession", () => {
  it("picks the module with the most remaining work and prefers due reviews", () => {
    expect(selectNextSession(buildHomeSnapshot())).toEqual({
      module: "research_english",
      queue: "review",
      remainingNew: 4,
      remainingReview: 6
    });
  });

  it("breaks remaining-count ties toward Research English", () => {
    expect(
      selectNextSession(
        buildHomeSnapshot({
          modules: {
            research_english: {
              module: "research_english",
              new: { completed: 9, total: 10 },
              review: { completed: 18, total: 18 },
              wordsLearned: 128
            },
            medical_english: {
              module: "medical_english",
              new: { completed: 9, total: 10 },
              review: { completed: 4, total: 4 },
              wordsLearned: 74
            }
          }
        })
      )
    ).toEqual({
      module: "research_english",
      queue: "new",
      remainingNew: 1,
      remainingReview: 0
    });
  });

  it("returns null when both modules are clear", () => {
    expect(
      selectNextSession(
        buildHomeSnapshot({
          modules: {
            research_english: {
              module: "research_english",
              new: { completed: 10, total: 10 },
              review: { completed: 18, total: 18 },
              wordsLearned: 128
            },
            medical_english: {
              module: "medical_english",
              new: { completed: 10, total: 10 },
              review: { completed: 4, total: 4 },
              wordsLearned: 74
            }
          }
        })
      )
    ).toBeNull();
  });
});
