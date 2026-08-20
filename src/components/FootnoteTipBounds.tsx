"use client";

import { useEffect } from "react";
import {
  BIBLE_TIP_OPEN_CLASS,
  BIBLE_TIP_WRAP_CLASS,
} from "@/components/bibleVerseTips";

const EDGE = 12;
const HOST_SELECTOR = `.preview-fn, .${BIBLE_TIP_WRAP_CLASS}`;

function viewBox() {
  const vv = window.visualViewport;
  if (vv) {
    return {
      left: vv.offsetLeft,
      right: vv.offsetLeft + vv.width,
      width: vv.width,
    };
  }
  return { left: 0, right: window.innerWidth, width: window.innerWidth };
}

function tipEl(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>(
    ":scope > .preview-fn-tip, :scope > .fb-enhancer-hover"
  );
}

function isBibleTip(tip: HTMLElement): boolean {
  return tip.classList.contains("fb-enhancer-hover");
}

function clearPlacement(tip: HTMLElement): void {
  tip.style.left = "";
  tip.style.right = "";
  tip.style.transform = "";
  tip.style.maxWidth = "";
  tip.removeAttribute("data-tip-placed");
}

function placeTip(host: HTMLElement, force = false): boolean {
  const tip = tipEl(host);
  if (!tip) return false;

  if (getComputedStyle(tip).display === "none") {
    clearPlacement(tip);
    return false;
  }

  if (!force && tip.getAttribute("data-tip-placed") === "1") {
    return true;
  }

  // Measure from the CSS-centered default, then pin with pixel left.
  tip.style.left = "50%";
  tip.style.right = "auto";
  tip.style.transform = "translateX(-50%)";

  const view = viewBox();
  const cap = isBibleTip(tip) ? 350 : 320;
  tip.style.maxWidth = `${Math.min(cap, view.width - EDGE * 2)}px`;

  const tipRect = tip.getBoundingClientRect();
  if (tipRect.width < 1 || tipRect.height < 1) return false;

  let left = tipRect.left;
  if (left < view.left + EDGE) {
    left = view.left + EDGE;
  } else if (left + tipRect.width > view.right - EDGE) {
    left = view.right - EDGE - tipRect.width;
  }

  const hostRect = host.getBoundingClientRect();
  tip.style.left = `${left - hostRect.left}px`;
  tip.style.transform = "none";
  tip.setAttribute("data-tip-placed", "1");
  return true;
}

function schedulePlace(host: HTMLElement): void {
  let tries = 0;
  const tick = () => {
    if (placeTip(host) || ++tries > 24) return;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function hosts(): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>(HOST_SELECTOR);
}

/**
 * Keeps publication footnote hover tips (and touch fetch(bible) tips)
 * inside the visual viewport (Firefox/Chrome mobile long-press near
 * screen edges).
 */
export function FootnoteTipBounds() {
  useEffect(() => {
    const onActivate = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const host = target.closest(HOST_SELECTOR);
      if (!(host instanceof HTMLElement)) return;
      // Long-press may paint :hover / open the tip after this event — retry a few frames.
      schedulePlace(host);
    };

    const onLeave = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const host = target.closest(HOST_SELECTOR);
      if (!(host instanceof HTMLElement)) return;
      if (host.classList.contains(BIBLE_TIP_OPEN_CLASS)) return;
      if (
        event instanceof FocusEvent &&
        event.relatedTarget instanceof Node &&
        host.contains(event.relatedTarget)
      ) {
        return;
      }
      if (
        event instanceof PointerEvent &&
        event.relatedTarget instanceof Node &&
        host.contains(event.relatedTarget)
      ) {
        return;
      }
      const tip = tipEl(host);
      if (tip) clearPlacement(tip);
    };

    const relocateOpen = () => {
      hosts().forEach((host) => {
        const tip = tipEl(host);
        if (!tip || getComputedStyle(tip).display === "none") return;
        placeTip(host, true);
      });
    };

    document.addEventListener("pointerover", onActivate, true);
    document.addEventListener("pointerdown", onActivate, true);
    document.addEventListener("touchstart", onActivate, { capture: true, passive: true });
    document.addEventListener("focusin", onActivate, true);
    document.addEventListener("pointerout", onLeave, true);
    document.addEventListener("focusout", onLeave, true);

    window.addEventListener("resize", relocateOpen);
    window.addEventListener("scroll", relocateOpen, true);
    window.visualViewport?.addEventListener("resize", relocateOpen);
    window.visualViewport?.addEventListener("scroll", relocateOpen);

    // Sticky :hover on mobile sometimes appears without a new pointer event.
    const poll = window.setInterval(() => {
      hosts().forEach((host) => {
        const tip = tipEl(host);
        if (!tip || getComputedStyle(tip).display === "none") return;
        if (tip.getAttribute("data-tip-placed") === "1") return;
        placeTip(host);
      });
    }, 300);

    return () => {
      document.removeEventListener("pointerover", onActivate, true);
      document.removeEventListener("pointerdown", onActivate, true);
      document.removeEventListener("touchstart", onActivate, true);
      document.removeEventListener("focusin", onActivate, true);
      document.removeEventListener("pointerout", onLeave, true);
      document.removeEventListener("focusout", onLeave, true);
      window.removeEventListener("resize", relocateOpen);
      window.removeEventListener("scroll", relocateOpen, true);
      window.visualViewport?.removeEventListener("resize", relocateOpen);
      window.visualViewport?.removeEventListener("scroll", relocateOpen);
      window.clearInterval(poll);
    };
  }, []);

  return null;
}
