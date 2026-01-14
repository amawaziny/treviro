// src/contexts/app-services-context.tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardService } from "@/lib/services/dashboard-service";
import { InvestmentService } from "@/lib/services/investment-service";
import { TransactionService } from "@/lib/services/transaction-service";
import { FinancialRecordsService } from "@/lib/services/financial-records-service";

interface AppServices {
  dashboardService: DashboardService | null;
  investmentService: InvestmentService | null;
  transactionService: TransactionService | null;
  financialRecordsService: FinancialRecordsService | null;
  userId?: string;
}

const AppServicesContext = createContext<AppServices>({
  dashboardService: null,
  investmentService: null,
  transactionService: null,
  financialRecordsService: null,
  userId: undefined,
});

export const AppServicesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const servicesRef = useRef<AppServices | null>(null);

  // Helper function to clean up services
  const cleanupServices = (services: AppServices) => {
    if (services.dashboardService?.cleanup) {
      services.dashboardService.cleanup();
    }
    if (services.transactionService?.cleanup) {
      services.transactionService.cleanup();
    }
  };

  // Initialize services when user logs in
  const services = useMemo(() => {
    // Skip if no user or services already initialized
    if (!user?.uid) {
      if (servicesRef.current) {
        // Clean up existing services if user logs out
        cleanupServices(servicesRef.current);
        servicesRef.current = null;
      }
      return null;
    }

    // Only create new services if they don't exist or user changed
    if (!servicesRef.current || servicesRef.current.userId !== user.uid) {
      // Clean up existing services if any
      if (servicesRef.current) {
        cleanupServices(servicesRef.current);
      }

      const financialRecordsService = new FinancialRecordsService(user.uid);
      const investmentService = new InvestmentService(user.uid);
      const transactionService = new TransactionService(user.uid);
      const dashboardService = new DashboardService(
        user.uid,
        investmentService,
        transactionService,
      );

      // Store in ref to prevent recreation
      servicesRef.current = {
        dashboardService,
        investmentService,
        transactionService,
        financialRecordsService,
        userId: user.uid, // Track the current user ID
      };

      // Set up subscriptions
      dashboardService.setupEventSubscriptions();
      transactionService.setupEventSubscriptions();
    }

    return servicesRef.current;
  }, [user?.uid]);

  // Cleanup on unmount or user change
  useEffect(() => {
    return () => {
      if (servicesRef.current) {
        cleanupServices(servicesRef.current);
        servicesRef.current = null;
      }
    };
  }, []); // Empty dependency array means this runs on unmount only

  // Only render children when services are ready
  if (!services && user?.uid) {
    return <div>Loading services...</div>; // Or a loading spinner
  }

  return (
    <AppServicesContext.Provider
      value={
        services || {
          dashboardService: null,
          investmentService: null,
          transactionService: null,
          financialRecordsService: null,
          userId: undefined,
        }
      }
    >
      {children}
    </AppServicesContext.Provider>
  );
};

export const useAppServices = () => {
  const context = useContext(AppServicesContext);
  if (context === undefined) {
    throw new Error(
      "useAppServices must be used within an AppServicesProvider",
    );
  }
  return context;
};
