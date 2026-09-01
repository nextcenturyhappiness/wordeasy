import axe from "axe-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContextCard } from "../../src/components/ContextCard";
import { researchCard } from "./fixtures";

describe("ContextCard", () => {
  it("implements the context-first front without leaking any answer", () => {
    const { container } = render(<ContextCard card={researchCard} revealed={false} />);

    expect(screen.getByText(/what does the missing word mean/i)).toBeInTheDocument();
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
      "IPA / part of speech",
      "适用范围",
      "句子来源"
    ]);
    expect(screen.getByText(researchCard.meaningEn)).toBeInTheDocument();
    expect(screen.getByText(researchCard.plainEnglishParaphrase)).toBeInTheDocument();
    expect(screen.getByText(researchCard.meaningZh).closest('[lang="zh-CN"]')).not.toBeNull();
    expect(
      screen.getByText(researchCard.sentenceTranslationZh).closest('[lang="zh-CN"]')
    ).not.toBeNull();
    expect(screen.getByText(researchCard.usageNote).closest('[lang="zh-CN"]')).not.toBeNull();
    expect(screen.getByText("为本词表撰写的例句")).toBeInTheDocument();
    expect(document.getElementById("context-sentence-anchor")).toHaveTextContent(
      researchCard.contextSentence
    );
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
