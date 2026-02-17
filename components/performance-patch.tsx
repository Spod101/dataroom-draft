"use client";

import { useEffect } from "react";

export function PerformancePatch() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const perf: any = window.performance;
    if (!perf || perf.__patched) return;

    if (typeof perf.measure === "function") {
      const originalMeasure = perf.measure.bind(perf);
      perf.measure = (...args: any[]) => {
        try {
          return originalMeasure(...args);
        } catch (err: any) {
          const message = err?.message ?? "";
          if (
            typeof message === "string" &&
            (message.includes("cannot have a negative time stamp") ||
             message.includes("negative timestamp") ||
             message.includes("Failed to execute 'measure'"))
          ) {
            return;
          }
          throw err;
        }
      };
    }

    if (typeof perf.getEntriesByType === "function") {
      const originalGetEntriesByType = perf.getEntriesByType.bind(perf);
      perf.getEntriesByType = (type: string) => {
        try {
          return originalGetEntriesByType(type);
        } catch (err: any) {
          const message = err?.message ?? "";
          if (
            typeof message === "string" &&
            (message.includes("negative") || message.includes("timestamp"))
          ) {
            return [];
          }
          throw err;
        }
      };
    }

    if (typeof perf.getEntriesByName === "function") {
      const originalGetEntriesByName = perf.getEntriesByName.bind(perf);
      perf.getEntriesByName = (name: string, type?: string) => {
        try {
          return originalGetEntriesByName(name, type);
        } catch (err: any) {
          const message = err?.message ?? "";
          if (
            typeof message === "string" &&
            (message.includes("negative") || message.includes("timestamp"))
          ) {
            return [];
          }
          throw err;
        }
      };
    }

    const errorHandler = (event: ErrorEvent) => {
      const message = event.message ?? "";
      if (
        typeof message === "string" &&
        (message.includes("Failed to execute 'measure'") ||
         message.includes("cannot have a negative time stamp") ||
         message.includes("negative timestamp"))
      ) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    window.addEventListener("error", errorHandler, true);

    perf.__patched = true;

    return () => {
      window.removeEventListener("error", errorHandler, true);
    };
  }, []);

  return null;
}

