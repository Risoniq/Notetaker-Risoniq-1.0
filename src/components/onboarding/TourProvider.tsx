import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  endTour: () => void;
  goToStep: (step: number) => void;
  isLoading: boolean;
  tourCompleted: boolean;
  checkTourStatus: () => Promise<boolean>;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const STORAGE_KEY_COMPLETED = "onboarding:tour_completed";
const STORAGE_KEY_SKIPPED = "onboarding:tour_skipped";
const TOTAL_STEPS = 4;

async function markTourCompletedInDB() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("onboarding_status" as any).upsert(
    { user_id: user.id, tour_completed: true, completed_at: new Date().toISOString() } as any,
    { onConflict: "user_id" }
  );
}

async function fetchTourStatus(): Promise<boolean | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("onboarding_status" as any)
    .select("tour_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return false; // No row = never completed
  return (data as any).tour_completed === true;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);

  const checkTourStatus = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const completed = await fetchTourStatus();
      if (completed === null) return true; // no user
      setTourCompleted(completed);
      // Also sync localStorage
      if (completed) {
        localStorage.setItem(STORAGE_KEY_COMPLETED, "true");
      }
      return completed;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Tour completed
      localStorage.setItem(STORAGE_KEY_COMPLETED, "true");
      localStorage.removeItem(STORAGE_KEY_SKIPPED);
      setIsActive(false);
      setCurrentStep(0);
      setTourCompleted(true);
      markTourCompletedInDB();
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY_SKIPPED, "true");
    setIsActive(false);
    setCurrentStep(0);
    setTourCompleted(true);
    markTourCompletedInDB();
  }, []);

  const endTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY_COMPLETED, "true");
    localStorage.removeItem(STORAGE_KEY_SKIPPED);
    setIsActive(false);
    setCurrentStep(0);
    setTourCompleted(true);
    markTourCompletedInDB();
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < TOTAL_STEPS) {
      setCurrentStep(step);
    }
  }, []);

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps: TOTAL_STEPS,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        endTour,
        goToStep,
        isLoading,
        tourCompleted,
        checkTourStatus,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTourContext() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error("useTourContext must be used within a TourProvider");
  }
  return context;
}

export { STORAGE_KEY_COMPLETED, STORAGE_KEY_SKIPPED };
