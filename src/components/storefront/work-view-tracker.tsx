"use client";

import { useEffect, useRef } from "react";

import { trackStorefrontEvent } from "@/lib/analytics-client";

export function WorkViewTracker({ workSlug }: { workSlug: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackStorefrontEvent({ type: "WORK_VIEW", workSlug });
  }, [workSlug]);

  return null;
}
