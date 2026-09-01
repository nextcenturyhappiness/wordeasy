import axe from "axe-core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContextCard } from "../../src/components/ContextCard";
import { SPEECH_UNAVAILABLE_MESSAGE } from "../../src/speech/systemTts";
import { researchCard } from "./fixtures";

describe("ContextCard", () => {
  it("implements the context-first front without leaking any answer", () => {
    const { container } = render(<ContextCard card={researchCard} revealed={false} />);

    expect(screen.getByText(/what does the missing word mean/i)).toBeInTheDocument();
    expect(screen.queryByText(/what does the highlighted word mean/i)).not.toBeInTheDocument();
    expect(container.querySelector("mark")).toBeNull();
    expect(container.querySelector(".context-blank")).toHaveAttribute(
      "aria-label",
      "hidden target word"
    );
    expect(screen.queryByText(researchCard.targetText)).not.toBeInTheDocument();
    expect(screen.queryByText(researchCard.meaningEn)).not.toBeInTheDocument();
    expect(screen.queryByText(researchCard.plainEnglishParaphrase)).not.toBeInTheDocument();
    expect(screen.queryByText(researchCard.meaningZh)).not.toBeInTheDocument();
    expect(screen.queryByText(researchCard.sentenceTranslationZh)).not.toBeInTheDocument();
    expect(screen.getByText(researchCard.ipa)).toBeInTheDocument();
    expect(document.getElementById("context-sentence-anchor")).not.toHaveTextContent(
      researchCard.ipa
    );
    expect(screen.queryByRole("button", { name: /speak /i })).not.toBeInTheDocument();
  });

  it("does not auto-speak on the cloze front", () => {
    const speakWord = vi.fn(() => ({ ok: true as const }));
    render(<ContextCard card={researchCard} revealed={false} speakWord={speakWord} />);

    expect(speakWord).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: `Speak ${researchCard.lemma}` })
    ).not.toBeInTheDocument();
  });

  it("reveals every required answer layer in a stable order", () => {
    render(<ContextCard card={researchCard} revealed />);

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);

    expect(headings).toEqual([
      "Meaning in this context",
      "Plain-English paraphrase",
      "中文释义",
      "完整句子翻译",
      "Common collocations",
      "适用范围",
      "句子来源"
    ]);
    expect(screen.queryByText(/what does the highlighted word mean/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/what does the missing word mean/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "IPA / part of speech" })).not.toBeInTheDocument();
    expect(screen.getByText(researchCard.meaningEn)).toBeInTheDocument();
    expect(screen.getByText(researchCard.plainEnglishParaphrase)).toBeInTheDocument();
    expect(screen.getByText(researchCard.meaningZh).closest('[lang="zh-CN"]')).not.toBeNull();
    expect(
      screen.getByText(researchCard.sentenceTranslationZh).closest('[lang="zh-CN"]')
    ).not.toBeNull();
    expect(screen.getByText(researchCard.usageNote).closest('[lang="zh-CN"]')).not.toBeNull();
    expect(screen.getByText("为本词表撰写的例句")).toBeInTheDocument();
    const sentenceAnchor = document.getElementById("context-sentence-anchor");
    expect(sentenceAnchor).toHaveTextContent(researchCard.contextSentence);
    const pronunciation = sentenceAnchor?.querySelector(".context-card__pronunciation");
    expect(pronunciation).toHaveTextContent(researchCard.ipa);
    expect(pronunciation).toHaveTextContent(researchCard.partOfSpeech);
    expect(screen.getAllByText(researchCard.ipa)).toHaveLength(1);
    expect(screen.getByText(researchCard.targetText, { selector: "mark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Speak ${researchCard.lemma}` })).toBeInTheDocument();
  });

  it("speaks the lemma, not the IPA, when the revealed IPA line is clicked", async () => {
    const user = userEvent.setup();
    const speakWord = vi.fn(() => ({ ok: true as const }));
    render(<ContextCard card={researchCard} revealed speakWord={speakWord} />);

    expect(speakWord).not.toHaveBeenCalled();
    const ipaButton = screen.getByRole("button", { name: `Speak ${researchCard.lemma}` });
    await user.click(ipaButton);
    await user.click(ipaButton);

    expect(speakWord).toHaveBeenCalledTimes(2);
    expect(speakWord).toHaveBeenCalledWith(researchCard.lemma);
    expect(speakWord).not.toHaveBeenCalledWith(researchCard.ipa);
    expect(speakWord).not.toHaveBeenCalledWith(researchCard.displayForm);
    expect(speakWord.mock.calls[0]?.[0]).not.toMatch(/\//u);
  });

  it("shows a one-line message when system speech is missing", async () => {
    const user = userEvent.setup();
    render(<ContextCard card={researchCard} revealed />);

    await user.click(screen.getByRole("button", { name: `Speak ${researchCard.lemma}` }));
    expect(screen.getByRole("status")).toHaveTextContent(SPEECH_UNAVAILABLE_MESSAGE);
  });

  it("has no automatically detectable accessibility violations when revealed", async () => {
    const { container } = render(<ContextCard card={researchCard} revealed />);

    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } }
    });
    expect(result.violations).toEqual([]);
  });
});
