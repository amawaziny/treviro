"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardSummaries, defaultDashboardSummaries } from "@/lib/types";
import { useAppServices } from "@/contexts/app-services-context";

export const useDashboard = () => {
  const { dashboardService } = useAppServices();
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaries>({
    ...defaultDashboardSummaries,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const setupSubscription = useCallback(() => {
    if (!dashboardService) return;

    setIsLoading(true);

    const unsubscribe = dashboardService.subscribeToDashboardSummary(
      (summary) => {
        setDashboardSummary(summary);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [dashboardService]);

  // Refresh dashboard data
  const refreshDashboard = useCallback(async () => {
    if (!dashboardService) throw new Error("Dashboard service not initialized");

    await dashboardService.recalculateDashboardSummary();
  }, [dashboardService]);

  // Initial subscription
  useEffect(() => {
    const unsubscribe = setupSubscription();
    return unsubscribe;
  }, [setupSubscription]);

  return {
    // State
    dashboardSummary,
    isLoading,
    error,

    // Methods
    refreshDashboard,
  };
};

export default useDashboard;
