"use client";

import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

type CardRailProps = ComponentPropsWithoutRef<"div">;

function isFinePointer() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function CardRail({
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ...props
}: CardRailProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    pointerId: null as number | null,
    startX: 0,
    scrollLeft: 0,
    dragging: false,
    moved: false,
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function onClickCapture(event: MouseEvent) {
      if (!stateRef.current.moved) return;
      event.preventDefault();
      event.stopPropagation();
      stateRef.current.moved = false;
    }

    root.addEventListener("click", onClickCapture, true);
    return () => root.removeEventListener("click", onClickCapture, true);
  }, []);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    onPointerDown?.(event);
    if (event.defaultPrevented || !isFinePointer() || event.button !== 0) {
      return;
    }

    const root = rootRef.current;
    if (!root) return;

    stateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: root.scrollLeft,
      dragging: true,
      moved: false,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);

    const state = stateRef.current;
    const root = rootRef.current;
    if (!state.dragging || !root || state.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - state.startX;
    if (Math.abs(dx) > 3) {
      if (!state.moved) {
        state.moved = true;
        root.setPointerCapture(event.pointerId);
        root.classList.add("is-dragging");
      }
    }
    root.scrollLeft = state.scrollLeft - dx;
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const state = stateRef.current;
    const root = rootRef.current;
    if (!state.dragging || state.pointerId !== event.pointerId) return;

    state.dragging = false;
    state.pointerId = null;
    root?.classList.remove("is-dragging");

    try {
      root?.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  }

  return (
    <div
      {...props}
      ref={rootRef}
      className={className}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        endDrag(event);
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        endDrag(event);
      }}
    />
  );
}
