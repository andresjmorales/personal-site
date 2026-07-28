"use client";

import { useState, type ReactNode } from "react";
import { CardRail } from "@/components/CardRail";

export type RailView = "rail" | "wrap";

type SectionRailProps = {
  id: string;
  title: string;
  /** Base scroll class, e.g. "project-scroll" or "writing-scroll". */
  railClassName: string;
  children: ReactNode;
  /** When false, renders heading only (no list / switcher). */
  hasItems?: boolean;
};

function RailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="3" width="4" height="10" rx="1" fill="currentColor" />
      <rect x="6" y="3" width="4" height="10" rx="1" fill="currentColor" />
      <rect x="11" y="3" width="4" height="10" rx="1" fill="currentColor" />
    </svg>
  );
}

function WrapIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

export function SectionRail({
  id,
  title,
  railClassName,
  children,
  hasItems = true,
}: SectionRailProps) {
  const [view, setView] = useState<RailView>("rail");
  const isRail = view === "rail";
  const listClassName = isRail
    ? railClassName
    : `${railClassName} ${railClassName}--wrap`;

  return (
    <section id={id} className="section">
      <div className="section-heading">
        <h2 className="section-title">{title}</h2>
        {hasItems ? (
          <div
            className="view-switcher"
            role="group"
            aria-label={`${title} view`}
          >
            <button
              type="button"
              className={`view-switcher-btn${isRail ? " is-active" : ""}`}
              aria-pressed={isRail}
              aria-label="Scroll rail view"
              onClick={() => setView("rail")}
            >
              <RailIcon />
            </button>
            <button
              type="button"
              className={`view-switcher-btn${!isRail ? " is-active" : ""}`}
              aria-pressed={!isRail}
              aria-label="Wrapped grid view"
              onClick={() => setView("wrap")}
            >
              <WrapIcon />
            </button>
          </div>
        ) : null}
      </div>
      {hasItems ? (
        isRail ? (
          <CardRail className={listClassName} role="list">
            {children}
          </CardRail>
        ) : (
          <div className={listClassName} role="list">
            {children}
          </div>
        )
      ) : null}
    </section>
  );
}
