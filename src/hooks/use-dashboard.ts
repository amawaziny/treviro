"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardService } from "@/lib/services/dashboard-service";
import { InvestmentService } from "@/lib/services/investment-service";
import { TransactionService } from "@/lib/services/transaction-service";
import { DashboardSummaries, defaultDashboardSummaries } from "@/lib/types";

export const useDashboard = () => {
  const { user } = useAuth();
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaries>({
    ...defaultDashboardSummaries,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize services
  const dashboardService = useMemo(() => {
    if (!user?.uid) return null;
    const investmentService = new InvestmentService(user.uid);
    const transactionService = new TransactionService(user.uid);
    return new DashboardService(
      user.uid,
      investmentService,
      transactionService,
    );
  }, [user?.uid]);

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
