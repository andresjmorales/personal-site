import type { PassageReference } from "@gracious.tech/fetch-client";
import type { BibleEnhancer } from "@gracious.tech/fetch-enhancer";

/** Wrapper around a fetch(bible) link so the verse tip can sit in the same CSS hover model as footnotes. */
export const BIBLE_TIP_WRAP_CLASS = "fb-enhancer-wrap";
export const BIBLE_TIP_OPEN_CLASS = "is-tip-open";

const LONG_PRESS_MS = 500;
const DISMISS_GRACE_MS = 500;

let openedAt = 0;

function clearTipPlacement(wrap: Element): void {
  const tip = wrap.querySelector<HTMLElement>(":scope > .fb-enhancer-hover");
  if (!tip) return;
  tip.style.left = "";
  tip.style.right = "";
  tip.style.transform = "";
  tip.style.maxWidth = "";
  tip.removeAttribute("data-tip-placed");
}

function closeOpenTips(except?: Element | null): void {
  document.querySelectorAll(`.${BIBLE_TIP_WRAP_CLASS}.${BIBLE_TIP_OPEN_CLASS}`).forEach((node) => {
    if (node === except) return;
    node.classList.remove(BIBLE_TIP_OPEN_CLASS);
    clearTipPlacement(node);
  });
}

function openTip(wrap: HTMLElement): void {
  closeOpenTips(wrap);
  wrap.classList.add(BIBLE_TIP_OPEN_CLASS);
  openedAt = Date.now();
  wrap.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
}

/**
 * fetch(bible) skips hover boxes when `(hover: hover)` is false. On touch,
 * long-press still shows the native link sheet; this keeps a verse tip open
 * after that sheet is dismissed, matching footnote chips.
 */
export function attachTouchVerseTip(
  enhancer: BibleEnhancer,
  element: HTMLElement,
  ref: PassageReference
): void {
  if (element.parentElement?.classList.contains(BIBLE_TIP_WRAP_CLASS)) return;

  const hoverBox = document.createElement("div");
  hoverBox.className =
    "fb-enhancer-hover fetch-bible no-chapters no-headings no-notes no-red-letter";
  hoverBox.setAttribute("role", "tooltip");
  void enhancer._set_hover_contents(hoverBox, ref);
  enhancer._hover_divs.push([hoverBox, ref]);
  hoverBox.addEventListener("click", () => {
    void enhancer.show_app(ref);
  });

  const wrap = document.createElement("span");
  wrap.className = BIBLE_TIP_WRAP_CLASS;
  element.replaceWith(wrap);
  wrap.append(element, hoverBox);

  let pressTimer: number | undefined;
  let pressStarted = 0;
  let pressMoved = false;
  const clearPress = () => {
    if (pressTimer === undefined) return;
    window.clearTimeout(pressTimer);
    pressTimer = undefined;
  };

  element.addEventListener("contextmenu", () => {
    openTip(wrap);
  });
  element.addEventListener(
    "touchstart",
    () => {
      clearPress();
      pressMoved = false;
      pressStarted = Date.now();
      pressTimer = window.setTimeout(() => {
        pressTimer = undefined;
        if (!pressMoved) openTip(wrap);
      }, LONG_PRESS_MS);
    },
    { passive: true }
  );
  element.addEventListener(
    "touchend",
    () => {
      const held = Date.now() - pressStarted;
      clearPress();
      if (!pressMoved && held >= LONG_PRESS_MS) openTip(wrap);
    },
    { passive: true }
  );
  element.addEventListener(
    "touchmove",
    () => {
      pressMoved = true;
      clearPress();
    },
    { passive: true }
  );
  element.addEventListener("touchcancel", clearPress, { passive: true });
  element.addEventListener(
    "click",
    (event) => {
      if (
        wrap.classList.contains(BIBLE_TIP_OPEN_CLASS) &&
        Date.now() - openedAt < DISMISS_GRACE_MS
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      wrap.classList.remove(BIBLE_TIP_OPEN_CLASS);
      clearTipPlacement(wrap);
    },
    true
  );
}

export function bindTouchVerseTipDismiss(): () => void {
  const onPointerDown = (event: Event) => {
    if (Date.now() - openedAt < DISMISS_GRACE_MS) return;
    const target = event.target;
    const wrap =
      target instanceof Element ? target.closest(`.${BIBLE_TIP_WRAP_CLASS}`) : null;
    closeOpenTips(wrap);
  };
  document.addEventListener("pointerdown", onPointerDown, true);
  return () => {
    document.removeEventListener("pointerdown", onPointerDown, true);
  };
}

export function closeAllVerseTips(): void {
  closeOpenTips();
}

export function patchEnhancerForTouchTips(enhancer: BibleEnhancer): void {
  const enhance = enhancer.enhance_element.bind(enhancer);
  enhancer.enhance_element = async (element, ref) => {
    await enhance(element, ref);
    if (!enhancer._can_hover) {
      attachTouchVerseTip(enhancer, element, ref);
    }
  };

  const showApp = enhancer.show_app.bind(enhancer);
  enhancer.show_app = (passage) => {
    closeAllVerseTips();
    showApp(passage);
  };
}
