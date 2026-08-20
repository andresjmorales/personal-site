"use client";

import { BibleClient } from "@gracious.tech/fetch-client";
import { BibleEnhancer } from "@gracious.tech/fetch-enhancer";
import { useEffect, useRef } from "react";
import { FETCH_BIBLE_TRANSLATION_ID } from "@/lib/bible";
import "@gracious.tech/fetch-client/client.css";
import "@gracious.tech/fetch-enhancer/styles.css";

const SKIP_TAGS = new Set([
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "PRE",
  "CODE",
  "KBD",
  "SAMP",
  "SCRIPT",
  "STYLE",
  "SVG",
  "TEXTAREA",
]);

function shouldDiscover(element: Element): boolean {
  if (SKIP_TAGS.has(element.tagName)) return false;
  if (element.classList.contains("preview-fn")) return false;
  if (element.classList.contains("preview-fn-tip")) return false;
  return true;
}

type Props = {
  html: string;
};

/**
 * Essay HTML plus fetch(bible) reference discovery. Client-only: the enhancer
 * walks the live DOM and is not SSR-compatible.
 */
export function ArticleBody({ html }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    const enhancer = new BibleEnhancer({
      client: new BibleClient({
        usage: {
          commercial: false,
          attributionless: false,
          derivatives: false,
          limitless: true,
        },
      }),
      translations: [FETCH_BIBLE_TRANSLATION_ID],
      spaces_to_nbsp: true,
    });

    void enhancer.discover_bible_references(root, (element) => {
      if (cancelled) return false;
      return shouldDiscover(element);
    });

    return () => {
      cancelled = true;
      enhancer.hide_app();
      enhancer._app_div.remove();
      for (const [hover] of enhancer._hover_divs) {
        hover.remove();
      }
    };
  }, [html]);

  return (
    <div
      ref={rootRef}
      className="editor-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
