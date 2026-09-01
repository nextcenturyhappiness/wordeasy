import axe from "axe-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContextCard } from "../../src/components/ContextCard";
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
  });

  it("has no automatically detectable accessibility violations when revealed", async () => {
    const { container } = render(<ContextCard card={researchCard} revealed />);

    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } }
    });
    expect(result.violations).toEqual([]);
  });
});
