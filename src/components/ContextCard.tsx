import { Fragment, type RefObject } from "react";

import type { ContextCardView } from "../application/contracts";

interface ContextCardProps {
  card: ContextCardView;
  revealed: boolean;
  answerRef?: RefObject<HTMLElement | null>;
  sentenceAnchorRef?: RefObject<HTMLElement | null>;
}

function HighlightedContext({ card, revealed }: { card: ContextCardView; revealed: boolean }) {
  const { contextSentence, targetText } = card;
  const parts: Array<{ text: string; highlighted: boolean }> = [];
  let cursor = 0;
  let matchIndex = contextSentence.indexOf(targetText, cursor);

  while (matchIndex !== -1 && targetText.length > 0) {
    if (matchIndex > cursor) {
      parts.push({ text: contextSentence.slice(cursor, matchIndex), highlighted: false });
    }

    parts.push({ text: targetText, highlighted: true });
    cursor = matchIndex + targetText.length;
    matchIndex = contextSentence.indexOf(targetText, cursor);
  }

  if (cursor < contextSentence.length || parts.length === 0) {
    parts.push({ text: contextSentence.slice(cursor), highlighted: false });
  }

  return (
    <p className="context-sentence">
      {parts.map((part, index) => (
        <Fragment key={`${String(index)}-${part.text}`}>
          {part.highlighted ? (
            revealed ? (
              <mark>{part.text}</mark>
            ) : (
              <span className="context-blank" aria-label="hidden target word">
                <span aria-hidden="true">{"\u00a0".repeat(Math.max(part.text.length, 4))}</span>
              </span>
            )
          ) : (
            part.text
          )}
        </Fragment>
      ))}
    </p>
  );
}

function SourceDetails({ card }: { card: ContextCardView }) {
  const { source } = card;

  if (source.type === "original_example") {
    return <p>为本词表撰写的例句</p>;
  }

  return (
    <div className="source-details">
      {source.url === null ? (
        <p>{source.title ?? "Verified source"}</p>
      ) : (
        <a href={source.url} rel="noreferrer" target="_blank">
          {source.title ?? "Open verified source"}
        </a>
      )}
      {source.doi === null ? null : <p>DOI: {source.doi}</p>}
      {source.pmid === null ? null : <p>PMID: {source.pmid}</p>}
    </div>
  );
}

export function ContextCard({ card, revealed, answerRef, sentenceAnchorRef }: ContextCardProps) {
  return (
    <article
      className="context-card"
      data-revealed={revealed ? "true" : "false"}
      aria-labelledby="context-question"
    >
      <header className="context-card__header">
        <p className="card-meta">
          <span>{card.partOfSpeech}</span>
          <span aria-hidden="true">·</span>
          <span>{card.ipa}</span>
        </p>
      </header>

      <div className="context-card__prompt" id="context-sentence-anchor" ref={sentenceAnchorRef}>
        <HighlightedContext card={card} revealed={revealed} />
      </div>
      <h1 className="context-question" id="context-question">
        {revealed
          ? "What does the highlighted word mean in this context?"
          : "What does the missing word mean in this context?"}
      </h1>

      {revealed ? (
        <section
          className="context-answer"
          id="context-answer"
          ref={answerRef}
          tabIndex={-1}
          aria-label="Answer"
        >
          <div className="answer-section answer-section--primary">
            <h2>Meaning in this context</h2>
            <p>{card.meaningEn}</p>
          </div>
          <div className="answer-section">
            <h2>Plain-English paraphrase</h2>
            <p>{card.plainEnglishParaphrase}</p>
          </div>
          <div className="answer-section" lang="zh-CN">
            <h2>中文释义</h2>
            <p>{card.meaningZh}</p>
          </div>
          <div className="answer-section" lang="zh-CN">
            <h2>完整句子翻译</h2>
            <p>{card.sentenceTranslationZh}</p>
          </div>
          <div className="answer-section">
            <h2>Common collocations</h2>
            <ul className="collocation-list">
              {card.collocations.map((collocation) => (
                <li key={collocation}>{collocation}</li>
              ))}
            </ul>
          </div>
          <div className="answer-section">
            <h2>IPA / part of speech</h2>
            <p>
              {card.ipa} · {card.partOfSpeech}
            </p>
          </div>
          <div className="answer-section" lang="zh-CN">
            <h2>适用范围</h2>
            <p>{card.usageNote}</p>
          </div>
          <div className="answer-section" lang="zh-CN">
            <h2>句子来源</h2>
            <SourceDetails card={card} />
          </div>
        </section>
      ) : null}
    </article>
  );
}
