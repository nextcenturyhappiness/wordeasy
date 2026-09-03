import { useEffect, useId, useRef, useState } from "react";

import type { LearningRepository, LexiconSearchHit } from "../application/contracts";
import { getModuleName } from "../app/moduleRoutes";

interface LexiconSearchProps {
  repository: LearningRepository;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function LexiconSearch({ repository }: LexiconSearchProps) {
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<LexiconSearchHit[]>([]);
  const [resultQuery, setResultQuery] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return;
    }

    let active = true;
    const handle = window.setTimeout(() => {
      void repository.searchLocalCards(trimmed).then((results) => {
        if (active) {
          setHits(results);
          setResultQuery(trimmed);
        }
      });
    }, 80);

    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [query, repository]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || isEditableTarget(event.target)) {
        return;
      }
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => {
      window.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  const trimmedQuery = query.trim();
  const showResults = trimmedQuery.length > 0 && resultQuery === trimmedQuery;

  return (
    <search className="lexicon-search" role="search" aria-label="Search learned Context Cards">
      <h2 className="lexicon-search__title" lang="zh-CN">
        词库
      </h2>
      <div className="lexicon-search__bar">
        <span className="lexicon-search__icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="22" height="22" fill="none">
            <circle cx="8.5" cy="8.5" r="5.25" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M12.4 12.4 16.2 16.2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <label className="sr-only" htmlFor={inputId}>
          Search learned Context Cards
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          lang="zh-CN"
          placeholder=""
          value={query}
          aria-controls={showResults ? listId : undefined}
          aria-expanded={showResults}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setQuery("");
              setResultQuery("");
              inputRef.current?.blur();
            }
          }}
        />
      </div>
      {showResults ? (
        hits.length === 0 ? (
          <p className="lexicon-search__empty" lang="zh-CN">
            还没有学过相关的词
          </p>
        ) : (
          <ul className="lexicon-search__results" id={listId}>
            {hits.map((hit) => (
              <li key={hit.cardId}>
                <p className="lexicon-search__meta">
                  <span>{getModuleName(hit.module)}</span>
                  {hit.learned ? <span>Learned</span> : null}
                </p>
                <p className="lexicon-search__lemma">{hit.lemma}</p>
                <p className="lexicon-search__sense">
                  <span>{hit.meaningEn}</span>
                  <span lang="zh-CN">{hit.meaningZh}</span>
                </p>
                <p className="lexicon-search__sentence">{hit.contextSentence}</p>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </search>
  );
}
