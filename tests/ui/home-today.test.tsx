import { useLearningApp } from "../../src/app/LearningAppContext";
import { HomePage } from "../../src/routes/home/HomePage";
import { TodayPage } from "../../src/routes/today/TodayPage";
import type { LearningRepository } from "../../src/application/contracts";
import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  buildHomeSnapshot,
  buildTodaySnapshot,
  createRepository,
  renderWithLearningApp
} from "./fixtures";

function ApplyResearchResult() {
  const { applyRatingResult } = useLearningApp();

  return (
    <button
      type="button"
      onClick={() => {
        applyRatingResult({
          eventId: "event-research-7",
          summary: {
            module: "research_english",
            new: { completed: 7, total: 10 },
            review: { completed: 12, total: 18 },
            wordsLearned: 129
          },
          nextCardId: null,
          syncStatus: "pending"
        });
      }}
    >
      Apply saved Research rating
    </button>
  );
}

function TodayRoute() {
  return (
    <Routes>
      <Route path="/today/:module" element={<TodayPage />} />
    </Routes>
  );
}

describe("Home and Today", () => {
  it("shows the passed local Home snapshot with two isolated module summaries", () => {
    const getCachedHome = vi.fn<LearningRepository["getCachedHome"]>(() =>
      Promise.resolve(buildHomeSnapshot())
    );
    const repository = createRepository({
      initialize: vi.fn<LearningRepository["initialize"]>(() => new Promise<void>(() => undefined)),
      getCachedHome
    });
    renderWithLearningApp(<HomePage />, { repository });

    const research = screen.getByRole("article", { name: "Research English" });
    const medical = screen.getByRole("article", { name: "Medical English" });

    expect(within(research).getByText("6 / 10")).toBeInTheDocument();
    expect(within(research).getByText("128 words learned")).toBeInTheDocument();
    expect(within(medical).getByText("3 / 10")).toBeInTheDocument();
    expect(within(medical).getByText("74 words learned")).toBeInTheDocument();
    expect(screen.getByText("12").closest(".streak-line")).toHaveTextContent(
      "12 days in your current streak"
    );
    expect(screen.getByRole("status")).toHaveTextContent("Synced");
    expect(getCachedHome).not.toHaveBeenCalled();
  });

  it("updates only the rated module and leaves the other module unchanged", async () => {
    const user = userEvent.setup();
    renderWithLearningApp(
      <>
        <HomePage />
        <ApplyResearchResult />
      </>
    );

    await user.click(screen.getByRole("button", { name: /apply saved research rating/i }));

    const research = screen.getByRole("article", { name: "Research English" });
    const medical = screen.getByRole("article", { name: "Medical English" });
    expect(within(research).getByText("7 / 10")).toBeInTheDocument();
    expect(within(medical).getByText("3 / 10")).toBeInTheDocument();
  });

  it("keeps New, Review, and Total progress separate and reports pending sync", async () => {
    const getToday = vi.fn<LearningRepository["getToday"]>(() =>
      Promise.resolve(buildTodaySnapshot())
    );
    const repository = createRepository({
      getToday
    });

    renderWithLearningApp(<TodayRoute />, {
      repository,
      initialEntries: ["/today/research"],
      syncState: { status: "pending", pendingCount: 3 }
    });

    expect(await screen.findByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(getToday).toHaveBeenCalledWith("research_english");
    const progress = screen.getByRole("definition", { name: "New" });
    expect(progress).toHaveTextContent("6");
    expect(progress).toHaveTextContent("10");
    expect(screen.getByRole("definition", { name: "Review" })).toHaveTextContent("12");
    const total = screen.getByRole("definition", { name: "Total today" });
    expect(within(total).getByText("18")).toBeInTheDocument();
    expect(within(total).getByText("28")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("3 changes pending");
  });

  it("renders honest no-review and content-shortage states without a New action", async () => {
    const repository = createRepository({
      getToday: vi.fn<LearningRepository["getToday"]>(() =>
        Promise.resolve(
          buildTodaySnapshot("research_english", {
            new: { completed: 0, total: 0 },
            review: { completed: 0, total: 0 },
            contentShortage: {
              code: "content_shortage",
              category: "bioinformatics",
              required: 3,
              available: 1,
              message: "Not enough new Bioinformatics cards are available."
            }
          })
        )
      )
    });

    renderWithLearningApp(<TodayRoute />, {
      repository,
      initialEntries: ["/today/research"],
      syncState: { status: "offline", pendingCount: 2 }
    });

    expect(
      await screen.findByText("Not enough new Bioinformatics cards are available.")
    ).toBeInTheDocument();
    expect(screen.getByText("No reviews are due today.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Continue New" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Offline · 2 changes pending");
  });

  it("does not invent progress while the saved Today snapshot is loading", async () => {
    let resolveToday: ((value: ReturnType<typeof buildTodaySnapshot>) => void) | undefined;
    const getToday = vi.fn<LearningRepository["getToday"]>(
      () =>
        new Promise<ReturnType<typeof buildTodaySnapshot>>((resolve) => {
          resolveToday = resolve;
        })
    );
    const repository = createRepository({
      getToday
    });

    renderWithLearningApp(<TodayRoute />, {
      repository,
      initialEntries: ["/today/research"]
    });

    expect(screen.getByText("Opening Today…")).toBeInTheDocument();
    expect(screen.queryByText("0 / 10")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(getToday).toHaveBeenCalledTimes(1);
    });
    resolveToday?.(buildTodaySnapshot());
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    });
  });
});
