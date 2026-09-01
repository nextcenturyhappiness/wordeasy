import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { LearningRepository, RateCardResult } from "../../src/application/contracts";
import { StudyPage } from "../../src/routes/study/StudyPage";
import * as systemTts from "../../src/speech/systemTts";
import {
  buildHomeSnapshot,
  createRepository,
  renderWithLearningApp,
  researchCard,
  secondResearchCard
} from "./fixtures";

function StudyRoute() {
  return (
    <Routes>
      <Route path="/study/:module" element={<StudyPage />} />
    </Routes>
  );
}

function savedResult(nextCardId: string | null): RateCardResult {
  return {
    eventId: "event-1",
    summary: {
      module: "research_english",
      new: { completed: 7, total: 10 },
      review: { completed: 12, total: 18 },
      wordsLearned: 129
    },
    nextCardId,
    syncStatus: "pending"
  };
}

describe("StudyPage", () => {
  it("shows the offline uncached queue prompt without presenting replacement cards", async () => {
    const getStudyQueue = vi.fn<LearningRepository["getStudyQueue"]>(() =>
      Promise.reject(new Error("No cached queue."))
    );
    const rateCard = vi.fn<LearningRepository["rateCard"]>();
    const repository = createRepository({ getStudyQueue, rateCard });

    renderWithLearningApp(<StudyRoute />, {
      repository,
      initialEntries: ["/study/research?queue=new"],
      syncState: { status: "offline", pendingCount: 0 }
    });

    expect(
      await screen.findByRole("heading", {
        name: "These cards are not cached for offline study."
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Reconnect once to cache the stable assignment. No replacement cards were generated."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to Today" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reveal answer/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: /how well did you remember/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(researchCard.targetText, { selector: "mark" })
    ).not.toBeInTheDocument();
    expect(getStudyQueue).toHaveBeenCalledWith("research_english", "new");
    expect(rateCard).not.toHaveBeenCalled();
  });

  it("reveals the answer with Space but ignores shortcuts from an input", async () => {
    const repository = createRepository();
    renderWithLearningApp(<StudyRoute />, {
      repository,
      initialEntries: ["/study/research?queue=new"]
    });

    expect(await screen.findByText(/what does the missing word mean/i)).toBeInTheDocument();
    expect(screen.queryByText(researchCard.meaningEn)).not.toBeInTheDocument();

    const input = document.createElement("input");
    input.setAttribute("aria-label", "Temporary input");
    document.body.append(input);
    input.focus();
    fireEvent.keyDown(input, { key: " ", code: "Space" });
    expect(screen.queryByText(researchCard.meaningEn)).not.toBeInTheDocument();
    input.remove();

    fireEvent.keyDown(window, { key: " ", code: "Space" });
    expect(await screen.findByText(researchCard.meaningEn)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "How well did you remember?" })).toBeInTheDocument();
  });

  it("creates one rating action for a double click and advances only after local commit", async () => {
    const user = userEvent.setup();
    let resolveRate: ((result: RateCardResult) => void) | undefined;
    const rateCard = vi.fn<LearningRepository["rateCard"]>(
      () =>
        new Promise<RateCardResult>((resolve) => {
          resolveRate = resolve;
        })
    );
    const repository = createRepository({ rateCard });

    renderWithLearningApp(<StudyRoute />, {
      repository,
      initialHome: buildHomeSnapshot({ studyDate: "2026-08-25" }),
      initialEntries: ["/study/research?queue=new"]
    });

    await screen.findByText(/what does the missing word mean/i);
    await user.click(screen.getByRole("button", { name: /reveal answer/i }));
    const good = screen.getByRole("button", { name: /good/i });
    await user.dblClick(good);

    expect(rateCard).toHaveBeenCalledTimes(1);
    expect(rateCard).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: researchCard.cardId,
        module: "research_english",
        queue: "new",
        studyDate: "2026-08-26"
      })
    );
    expect(good).toBeDisabled();
    expect(screen.getByText(researchCard.meaningEn)).toBeInTheDocument();

    resolveRate?.(savedResult(secondResearchCard.cardId));
    await waitFor(() => {
      expect(screen.getByText(/the association remained/i)).toBeInTheDocument();
    });
    expect(document.querySelector(".context-blank")).toHaveAttribute(
      "aria-label",
      "hidden target word"
    );
    expect(screen.queryByText(secondResearchCard.targetText)).not.toBeInTheDocument();
    expect(screen.queryByText(researchCard.meaningEn)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reveal answer/i })).toBeEnabled();
  });

  it("blocks rapid and repeated keyboard ratings", async () => {
    let resolveRate: ((result: RateCardResult) => void) | undefined;
    const rateCard = vi.fn<LearningRepository["rateCard"]>(
      () =>
        new Promise<RateCardResult>((resolve) => {
          resolveRate = resolve;
        })
    );
    const repository = createRepository({ rateCard });

    renderWithLearningApp(<StudyRoute />, {
      repository,
      initialEntries: ["/study/research?queue=new"]
    });

    await screen.findByText(/what does the missing word mean/i);
    fireEvent.keyDown(window, { key: " ", code: "Space" });
    await screen.findByText(researchCard.meaningEn);
    fireEvent.keyDown(window, { key: "3" });
    fireEvent.keyDown(window, { key: "3", repeat: true });
    fireEvent.keyDown(window, { key: "3" });

    expect(rateCard).toHaveBeenCalledTimes(1);
    resolveRate?.(savedResult(null));
    expect(await screen.findByRole("heading", { name: "Queue complete." })).toBeInTheDocument();
  });

  it("keeps the current revealed card after a local failure and retries the same action", async () => {
    const user = userEvent.setup();
    const rateCard = vi
      .fn<LearningRepository["rateCard"]>()
      .mockRejectedValueOnce(new Error("Local storage is temporarily unavailable."))
      .mockResolvedValueOnce(savedResult(null));
    const repository = createRepository({ rateCard });

    renderWithLearningApp(<StudyRoute />, {
      repository,
      initialEntries: ["/study/research?queue=new"]
    });

    await screen.findByText(/what does the missing word mean/i);
    await user.click(screen.getByRole("button", { name: /reveal answer/i }));
    await user.click(screen.getByRole("button", { name: /good/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Your answer was not saved locally");
    expect(screen.getByText(researchCard.meaningEn)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /good/i })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /good/i }));
    expect(await screen.findByRole("heading", { name: "Queue complete." })).toBeInTheDocument();
    expect(rateCard).toHaveBeenCalledTimes(2);
    expect(rateCard.mock.calls[0]?.[0].presentationActionId).toBe(
      rateCard.mock.calls[1]?.[0].presentationActionId
    );
  });

  it("keeps the context sentence as the reveal scroll anchor", async () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollIntoView"
    );
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
      writable: true
    });
    const focus = vi.spyOn(HTMLElement.prototype, "focus");

    try {
      const repository = createRepository();
      renderWithLearningApp(<StudyRoute />, {
        repository,
        initialEntries: ["/study/research?queue=new"]
      });

      await screen.findByText(/what does the missing word mean/i);
      expect(document.querySelector("mark")).toBeNull();
      fireEvent.keyDown(window, { key: " ", code: "Space" });

      expect(await screen.findByText(researchCard.meaningEn)).toBeInTheDocument();
      expect(screen.queryByText(/what does the highlighted word mean/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/what does the missing word mean/i)).not.toBeInTheDocument();
      const anchor = document.getElementById("context-sentence-anchor");
      expect(anchor).toHaveTextContent(researchCard.contextSentence);
      expect(anchor).toHaveTextContent(researchCard.ipa);
      expect(anchor).toHaveTextContent(researchCard.partOfSpeech);
      expect(screen.getByText(researchCard.targetText, { selector: "mark" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "适用范围" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "句子来源" })).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "IPA / part of speech" })
      ).not.toBeInTheDocument();

      await waitFor(() => {
        expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", inline: "nearest" });
      });
      expect(scrollIntoView.mock.instances).toContain(anchor);

      const ratingGroup = screen.getByRole("group", { name: /how well did you remember/i });
      expect(scrollIntoView.mock.instances).not.toContain(ratingGroup);

      await waitFor(() => {
        expect(focus).toHaveBeenCalledWith({ preventScroll: true });
      });
    } finally {
      if (originalScrollIntoView === undefined) {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
      } else {
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
      }
      focus.mockRestore();
    }
  });

  it("does not auto-speak on the cloze front or when revealing", async () => {
    const user = userEvent.setup();
    const speak = vi.spyOn(systemTts, "speakEnglishWord").mockReturnValue({ ok: true });
    try {
      const repository = createRepository();
      renderWithLearningApp(<StudyRoute />, {
        repository,
        initialEntries: ["/study/research?queue=new"]
      });

      await screen.findByText(/what does the missing word mean/i);
      expect(speak).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("button", { name: `Speak ${researchCard.lemma}` })
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /reveal answer/i }));
      expect(await screen.findByText(researchCard.meaningEn)).toBeInTheDocument();
      expect(speak).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: `Speak ${researchCard.lemma}` }));
      expect(speak).toHaveBeenCalledTimes(1);
      expect(speak).toHaveBeenCalledWith(researchCard.lemma);
      expect(speak).not.toHaveBeenCalledWith(researchCard.ipa);
    } finally {
      speak.mockRestore();
    }
  });
});
