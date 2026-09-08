import { Fragment, useEffect, useState, type RefObject } from "react";

import { categoryLabel } from "../app/categoryLabels";
import type { ContextCardView } from "../application/contracts";
import {
  cancelEnglishSpeech,
  speakEnglishWord,
  spokenWordForCard,
  type SpeakWordResult
} from "../speech/systemTts";

interface ContextCardProps {
  card: ContextCardView;
  revealed: boolean;
  answerRef?: RefObject<HTMLElement | null>;
  sentenceAnchorRef?: RefObject<HTMLDivElement | null>;
  speakWord?: (word: string) => SpeakWordResult;
}

function HighlightedContext({ card }: { card: ContextCardView }) {
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
          {part.highlighted ? <mark>{part.text}</mark> : part.text}
        </Fragment>
      ))}
    </p>
  );
}

function IpaSpeakLine({
  ipa,
  partOfSpeech,
  word,
  speakWord
}: {
  ipa: string;
  partOfSpeech: string;
  word: string;
  speakWord: (word: string) => SpeakWordResult;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="ipa-speak-block">
      <button
        type="button"
        className="card-meta context-card__pronunciation ipa-speak"
        onClick={() => {
          const result = speakWord(word);
          setError(result.ok ? null : result.message);
        }}
        aria-label={`Speak ${word}`}
      >
        <span>{ipa}</span>
        <span aria-hidden="true">·</span>
        <span className="context-card__part-of-speech">{partOfSpeech}</span>
        <span className="ipa-speak__mark" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
            <path d="M2.6 6.1h2.2L7.6 3.8v8.4L4.8 9.9H2.6V6.1Z" fill="currentColor" />
            <path
              d="M9.5 6.05c.72.58.72 3.32 0 3.9"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
            />
            <path
              d="M11.15 4.7c1.35 1.12 1.35 5.48 0 6.6"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
      {error === null ? null : (
        <p className="ipa-speak__error" role="status">
          {error}
        </p>
      )}
    </div>
  );
}

export function ContextCard({
  card,
  revealed,
  answerRef,
  sentenceAnchorRef,
  speakWord = speakEnglishWord
}: ContextCardProps) {
  useEffect(() => {
    return () => {
      cancelEnglishSpeech();
    };
  }, [card.cardId]);

  return (
    <article
      className="context-card"
      data-revealed={revealed ? "true" : "false"}
      aria-labelledby="context-question"
    >
      {revealed ? null : (
        <header className="context-card__header">
          <p className="card-meta">
            <span>{card.partOfSpeech}</span>
            <span aria-hidden="true">·</span>
            <span>{card.ipa}</span>
            {card.category === "" ? null : (
              <>
                <span aria-hidden="true">·</span>
                <span lang={card.category === "morphology" ? "zh-CN" : undefined}>
                  {categoryLabel(card.category)}
                </span>
              </>
            )}
          </p>
        </header>
      )}

      <h1 className={revealed ? "sr-only" : "context-lemma"} id="context-question">
        {card.lemma}
      </h1>

      <div className="context-card__prompt" id="context-sentence-anchor" ref={sentenceAnchorRef}>
        <HighlightedContext card={card} />
        {revealed ? (
          <IpaSpeakLine
            ipa={card.ipa}
            partOfSpeech={card.partOfSpeech}
            word={spokenWordForCard(card)}
            speakWord={speakWord}
          />
        ) : null}
      </div>
      {revealed ? null : (
        <p className="context-question">What does this word mean in this context?</p>
      )}

      {revealed ? (
        <section
          className="context-answer"
          id="context-answer"
          ref={answerRef}
          tabIndex={-1}
          aria-label="Answer"
        >
          <div className="answer-section answer-section--meaning" lang="zh-CN">
            <h2>中文释义</h2>
            <p className="answer-meaning-zh">{card.meaningZh}</p>
          </div>
          <div className="answer-section answer-section--meaning-en">
            <p className="answer-meaning-en">{card.meaningEn}</p>
          </div>
          <div className="answer-section answer-section--quiet">
            <p className="answer-secondary">{card.plainEnglishParaphrase}</p>
            <p className="answer-secondary" lang="zh-CN">
              {card.sentenceTranslationZh}
            </p>
          </div>
          {card.collocations.length === 0 ? null : (
            <div className="answer-section answer-section--quiet">
              <h2>Common collocations</h2>
              <ul className="collocation-list">
                {card.collocations.map((collocation) => (
                  <li key={collocation}>{collocation}</li>
                ))}
              </ul>
            </div>
          )}
          {card.usageNote.trim() === "" ? null : (
            <div className="answer-section answer-section--quiet" lang="zh-CN">
              <h2>适用范围</h2>
              <p>{card.usageNote}</p>
            </div>
          )}
        </section>
      ) : null}
    </article>
  );
}
