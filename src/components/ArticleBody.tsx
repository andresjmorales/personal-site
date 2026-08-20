"use client";

import { BibleClient } from "@gracious.tech/fetch-client";
import { BibleEnhancer } from "@gracious.tech/fetch-enhancer";
import { useEffect, useRef } from "react";
import {
  bindTouchVerseTipDismiss,
  patchEnhancerForTouchTips,
} from "@/components/bibleVerseTips";
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
  if (element.classList.contains("fb-enhancer-wrap")) return false;
  if (element.classList.contains("fb-enhancer-hover")) return false;
  return true;
}

function isHoverAttribution(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest(".fb-enhancer-hover .fb-attribution"))
  );
}

/** The enhancer makes the whole hover a button; keep only the BSB label clickable. */
function ignoreHoverPassageClicks(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (!target.closest(".fb-enhancer-hover")) return;
  if (isHoverAttribution(target)) return;
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function decorateHoverAttribution(root: ParentNode): void {
  root.querySelectorAll(".fb-enhancer-hover .fb-attribution").forEach((node) => {
    if (!(node instanceof HTMLElement) || node.dataset.bibleOpen) return;
    node.dataset.bibleOpen = "1";
    node.setAttribute("role", "link");
    node.setAttribute("title", "Open in fetch(bible)");
    node.tabIndex = 0;
  });
}

function openAttributionWithKeyboard(event: KeyboardEvent): void {
  if (event.key !== "Enter" && event.key !== " ") return;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains("fb-attribution")) return;
  if (!target.closest(".fb-enhancer-hover")) return;
  event.preventDefault();
  target.click();
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
    patchEnhancerForTouchTips(enhancer);

    void enhancer.discover_bible_references(root, (element) => {
      if (cancelled) return false;
      return shouldDiscover(element);
    });

    decorateHoverAttribution(document);
    const observer = new MutationObserver(() => {
      decorateHoverAttribution(document);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", ignoreHoverPassageClicks, true);
    document.addEventListener("keydown", openAttributionWithKeyboard, true);
    const unbindTipDismiss = bindTouchVerseTipDismiss();

    return () => {
      cancelled = true;
      observer.disconnect();
      unbindTipDismiss();
      document.removeEventListener("click", ignoreHoverPassageClicks, true);
      document.removeEventListener("keydown", openAttributionWithKeyboard, true);
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
