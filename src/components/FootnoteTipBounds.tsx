"use client";

import { useEffect } from "react";

const EDGE = 12;

function clampTip(fn: HTMLElement): void {
  const tip = fn.querySelector<HTMLElement>(".preview-fn-tip");
  if (!tip) return;

  tip.style.setProperty("--tip-shift-x", "0px");

  // Measure after the tip is painted (CSS :hover / :focus-within).
  requestAnimationFrame(() => {
    const rect = tip.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    let shift = 0;
    if (rect.left < EDGE) {
      shift = EDGE - rect.left;
    } else if (rect.right > window.innerWidth - EDGE) {
      shift = window.innerWidth - EDGE - rect.right;
    }

    tip.style.setProperty("--tip-shift-x", `${shift}px`);
  });
}

function resetTip(fn: HTMLElement): void {
  const tip = fn.querySelector<HTMLElement>(".preview-fn-tip");
  tip?.style.removeProperty("--tip-shift-x");
}

/**
 * Keeps publication footnote hover tips inside the viewport horizontally
 * (important on mobile long-press near the screen edges).
 */
export function FootnoteTipBounds() {
  useEffect(() => {
    const onActivate = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const fn = target.closest(".preview-fn");
      if (!(fn instanceof HTMLElement)) return;
      clampTip(fn);
    };

    const onLeave = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const fn = target.closest(".preview-fn");
      if (!(fn instanceof HTMLElement)) return;
      // Don't reset while focus moves into the tip (links).
      if (
        event instanceof FocusEvent &&
        event.relatedTarget instanceof Node &&
        fn.contains(event.relatedTarget)
      ) {
        return;
      }
      resetTip(fn);
    };

    // pointerover bubbles (pointerenter does not), which matters for long-press.
    document.addEventListener("pointerover", onActivate, true);
    document.addEventListener("focusin", onActivate, true);
    document.addEventListener("pointerout", onLeave, true);
    document.addEventListener("focusout", onLeave, true);

    const onViewportChange = () => {
      document.querySelectorAll<HTMLElement>(".preview-fn").forEach((fn) => {
        const tip = fn.querySelector(".preview-fn-tip");
        if (!tip) return;
        const style = getComputedStyle(tip);
        if (style.display === "none") return;
        clampTip(fn);
      });
    };

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      document.removeEventListener("pointerover", onActivate, true);
      document.removeEventListener("focusin", onActivate, true);
      document.removeEventListener("pointerout", onLeave, true);
      document.removeEventListener("focusout", onLeave, true);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, []);

  return null;
}
