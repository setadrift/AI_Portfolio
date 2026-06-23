"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

declare global {
  interface Window {
    gtag?: (
      command: "event",
      action: string,
      params: Record<string, string | number | undefined>,
    ) => void;
  }
}

type BookingConversionLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
};

export default function BookingConversionLink({
  children,
  onClick,
  ...props
}: BookingConversionLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    window.gtag?.("event", "conversion", {
      send_to: process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_CONVERSION_SEND_TO || "",
      event_category: "lead",
      event_label: "booking_click",
    });
    onClick?.(event);
  }

  return (
    <a {...props} onClick={handleClick}>
      {children}
    </a>
  );
}
