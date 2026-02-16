"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppSettingsService } from "@/lib/services/app-settings-service";
import { AppSettings, defaultAppSettings } from "@/lib/types";

export const useAppSettings = () => {
  const { user } = useAuth();
  const [appSettings, setAppSettings] =
    useState<AppSettings>(defaultAppSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize service
  const appSettingsService = useMemo(() => {
    if (!user?.uid) return null;
    return new AppSettingsService(user.uid);
  }, [user?.uid]);

  // Fetch app settings
  const fetchAppSettings = useCallback(async () => {
    if (!appSettingsService) return;

    try {
      setIsLoading(true);
      let settings = await appSettingsService.getAppSettings();

      // If no settings exist, initialize with defaults
      if (!settings) {
        settings = await appSettingsService.initializeDefaultSettings();
      }

      setAppSettings(settings);
      setError(null);
    } catch (err) {
      console.error("Error in fetchAppSettings:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch app settings"),
      );
      setAppSettings(defaultAppSettings);
    } finally {
      setIsLoading(false);
    }
  }, [appSettingsService]);

  // Update app settings
  const updateAppSettings = useCallback(
    async (settings: Partial<AppSettings>): Promise<AppSettings> => {
      if (!appSettingsService) {
        throw new Error("App settings service not initialized");
      }

      try {
        setIsLoading(true);
        const updatedSettings =
          await appSettingsService.updateAppSettings(settings);
        setAppSettings((prev) => ({
          ...prev,
          ...updatedSettings,
        }));
        setError(null);
        return updatedSettings;
      } catch (err) {
        console.error("Error updating app settings:", err);
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to update app settings");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [appSettingsService],
  );

  // Load settings on mount and when service changes
  useEffect(() => {
    if (appSettingsService) {
      fetchAppSettings();
    }
  }, [appSettingsService, fetchAppSettings]);

  return {
    appSettings,
    isLoading,
    error,
    updateAppSettings,
    refresh: fetchAppSettings,
  };
};
