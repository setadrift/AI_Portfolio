"use client";

import { useEffect, useRef } from "react";

const loadingClass = "ttg-dashboard-is-loading";
const loadingEvent = "ttg-dashboard-navigation-start";

export function startDashboardNavigation() {
  window.dispatchEvent(new Event(loadingEvent));
}

export function DashboardNavigationProgress({ navigationKey }: { navigationKey: string }) {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.remove(loadingClass);
    progressRef.current?.setAttribute("aria-hidden", "true");
  }, [navigationKey]);

  useEffect(() => {
    const start = () => {
      document.documentElement.classList.add(loadingClass);
      progressRef.current?.setAttribute("aria-hidden", "false");
    };
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>(".ttg-dashboard-shell a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.href === window.location.href || destination.origin !== window.location.origin) return;
      start();
    };

    window.addEventListener(loadingEvent, start);
    document.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener(loadingEvent, start);
      document.removeEventListener("click", handleClick);
      document.documentElement.classList.remove(loadingClass);
    };
  }, []);

  return (
    <div className="ttg-navigation-progress" aria-hidden="true" ref={progressRef}>
      <div role="status" aria-live="polite">
        <span aria-hidden="true" />
        <strong>Loading dashboard</strong>
      </div>
    </div>
  );
}
