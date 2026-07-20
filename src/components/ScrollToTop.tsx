"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Ensure soft navigations land at the very top (sticky header can otherwise clip titles). */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
