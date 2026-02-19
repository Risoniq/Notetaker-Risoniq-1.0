import { useEffect, useCallback, useRef } from "react";
import { useTourContext, STORAGE_KEY_COMPLETED, STORAGE_KEY_SKIPPED } from "@/components/onboarding/TourProvider";

export function useOnboardingTour() {
  const context = useTourContext();

  const shouldShowTour = useCallback(() => {
    // Quick local check first
    const completed = localStorage.getItem(STORAGE_KEY_COMPLETED);
    const skipped = localStorage.getItem(STORAGE_KEY_SKIPPED);
    return !completed && !skipped;
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_COMPLETED);
    localStorage.removeItem(STORAGE_KEY_SKIPPED);
    context.startTour();
  }, [context]);

  const startTourIfFirstVisit = useCallback(async () => {
    // Quick local check
    if (!shouldShowTour()) return;

    // DB check (source of truth)
    const completed = await context.checkTourStatus();
    if (completed) return;

    // Small delay to ensure the page is fully rendered
    setTimeout(() => {
      context.startTour();
    }, 500);
  }, [shouldShowTour, context]);

  return {
    ...context,
    shouldShowTour,
    resetTour,
    startTourIfFirstVisit,
  };
}

// Hook to auto-start tour on first visit
export function useAutoStartTour() {
  const { startTourIfFirstVisit } = useOnboardingTour();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    startTourIfFirstVisit();
  }, [startTourIfFirstVisit]);
}
