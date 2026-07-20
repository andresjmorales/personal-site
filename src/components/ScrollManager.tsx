"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Client navigations from a scrolled writing page can leave the viewport
 * mid-document so the sticky header clips the About title. Reset to top
 * when landing on `/` without a hash.
 */
export function ScrollManager() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
