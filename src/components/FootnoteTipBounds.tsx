"use client";

import { useEffect } from "react";

const EDGE = 12;

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

function clearPlacement(tip: HTMLElement): void {
  tip.style.left = "";
  tip.style.right = "";
  tip.style.transform = "";
  tip.style.maxWidth = "";
  tip.removeAttribute("data-tip-placed");
}

function placeTip(fn: HTMLElement, force = false): boolean {
  const tip = fn.querySelector<HTMLElement>(".preview-fn-tip");
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
  tip.style.maxWidth = `${Math.min(320, view.width - EDGE * 2)}px`;

  const tipRect = tip.getBoundingClientRect();
  if (tipRect.width < 1 || tipRect.height < 1) return false;

  let left = tipRect.left;
  if (left < view.left + EDGE) {
    left = view.left + EDGE;
  } else if (left + tipRect.width > view.right - EDGE) {
    left = view.right - EDGE - tipRect.width;
  }

  const fnRect = fn.getBoundingClientRect();
  tip.style.left = `${left - fnRect.left}px`;
  tip.style.transform = "none";
  tip.setAttribute("data-tip-placed", "1");
  return true;
}

function schedulePlace(fn: HTMLElement): void {
  let tries = 0;
  const tick = () => {
    if (placeTip(fn) || ++tries > 24) return;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Keeps publication footnote hover tips inside the visual viewport
 * (Firefox/Chrome mobile long-press near screen edges).
 */
export function FootnoteTipBounds() {
  useEffect(() => {
    const onActivate = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const fn = target.closest(".preview-fn");
      if (!(fn instanceof HTMLElement)) return;
      // Long-press may paint :hover after this event — retry a few frames.
      schedulePlace(fn);
    };

    const onLeave = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const fn = target.closest(".preview-fn");
      if (!(fn instanceof HTMLElement)) return;
      if (
        event instanceof FocusEvent &&
        event.relatedTarget instanceof Node &&
        fn.contains(event.relatedTarget)
      ) {
        return;
      }
      if (
        event instanceof PointerEvent &&
        event.relatedTarget instanceof Node &&
        fn.contains(event.relatedTarget)
      ) {
        return;
      }
      const tip = fn.querySelector<HTMLElement>(".preview-fn-tip");
      if (tip) clearPlacement(tip);
    };

    const relocateOpen = () => {
      document.querySelectorAll<HTMLElement>(".preview-fn").forEach((fn) => {
        const tip = fn.querySelector<HTMLElement>(".preview-fn-tip");
        if (!tip || getComputedStyle(tip).display === "none") return;
        placeTip(fn, true);
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
      document.querySelectorAll<HTMLElement>(".preview-fn").forEach((fn) => {
        const tip = fn.querySelector<HTMLElement>(".preview-fn-tip");
        if (!tip || getComputedStyle(tip).display === "none") return;
        if (tip.getAttribute("data-tip-placed") === "1") return;
        placeTip(fn);
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
