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

  // Fetch dashboard summary
  const fetchDashboardSummary = useCallback(async () => {
    if (!dashboardService) {
      throw new Error("Dashboard service not initialized");
    }

    setIsLoading(true);
    setError(null);

    try {
      const summary = await dashboardService.getDashboardSummary();
      setDashboardSummary(summary);
      return summary;
    } catch (err) {
      console.error("Failed to fetch dashboard summary:", err);
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch dashboard summary"),
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [dashboardService]);

  // Refresh dashboard data
  const refreshDashboard = useCallback(async () => {
    if (!dashboardService) {
      throw new Error("Dashboard service not initialized");
    }

    try {
      await dashboardService.recalculateDashboardSummary();
      return await fetchDashboardSummary();
    } catch (err) {
      console.error("Failed to refresh dashboard:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to refresh dashboard"),
      );
      throw err;
    }
  }, [dashboardService, fetchDashboardSummary]);

  // Initial fetch
  useEffect(() => {
    if (dashboardService) {
      fetchDashboardSummary();
    }
  }, [dashboardService, fetchDashboardSummary]);

  return {
    // State
    dashboardSummary,
    isLoading,
    error,

    // Methods
    refreshDashboard,
    getDashboardSummary: fetchDashboardSummary,
  };
};

export default useDashboard;
