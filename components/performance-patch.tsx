"use client";

import { useEffect } from "react";

/**
 * Temporary workaround for Next.js dev bug:
 * "Failed to execute 'measure' on 'Performance': 'Page' cannot have a negative time stamp."
 *
 * This only runs in the browser and in development and silently
 * ignores those specific Performance.measure errors.
 */
export function PerformancePatch() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "production") return;

    const perf: any = window.performance;
    if (!perf || typeof perf.measure !== "function" || perf.__patched) return;

    const originalMeasure = perf.measure.bind(perf);

    perf.measure = (...args: any[]) => {
      try {
        return originalMeasure(...args);
      } catch (err: any) {
        const message = err?.message ?? "";
        if (typeof message === "string" && message.includes("cannot have a negative time stamp")) {
          // Ignore this known dev-only Next.js timing bug
          return;
        }
        throw err;
      }
    };

    perf.__patched = true;
  }, []);

  return null;
}

