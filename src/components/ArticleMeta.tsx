"use client";

import { useEffect, useId, useRef, useState } from "react";

type ArticleMetaProps = {
  date: string | null;
  dateLabel: string | null;
  wordCount: number;
  tags: string[];
  canonical: string | null;
};

function InfoIcon() {
  return (
    <svg
      className="article-meta-info-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M12 11.25v5"
      />
      <circle cx="12" cy="8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function SubstackIcon() {
  return (
    <svg
      className="article-meta-substack-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"
      />
    </svg>
  );
}

export function ArticleMeta({
  date,
  dateLabel,
  wordCount,
  tags,
  canonical,
}: ArticleMetaProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const wordLabel = `${wordCount.toLocaleString("en-US")} words`;
  const isSubstack = Boolean(canonical?.includes("substack.com"));
  const sourceLabel = isSubstack ? "Substack" : "Original";
  const tagsLabel = tags.join(" · ");

  return (
    <div className="document-preview-meta" ref={rootRef}>
      {dateLabel ? (
        <time dateTime={date || undefined}>{dateLabel}</time>
      ) : null}

      <div className={`article-meta-disclosure${open ? " is-open" : ""}`}>
        <div
          id={panelId}
          className="article-meta-panel"
          aria-hidden={!open}
          inert={open ? undefined : true}
        >
          <span className="article-meta-item">{wordLabel}</span>

          {tags.length > 0 ? (
            <span className="article-meta-item article-meta-tags" title={tagsLabel}>
              {tagsLabel}
            </span>
          ) : null}

          {canonical ? (
            <a
              className="article-meta-item article-meta-source"
              href={canonical}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={open ? undefined : -1}
            >
              {isSubstack ? <SubstackIcon /> : null}
              <span>{sourceLabel}</span>
            </a>
          ) : null}
        </div>

        <button
          type="button"
          className="article-meta-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <InfoIcon />
          <span className="sr-only">
            {open ? "Hide article details" : "Show article details"}
          </span>
        </button>
      </div>
    </div>
  );
}
