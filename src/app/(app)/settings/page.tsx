
"use client";

import React, { useEffect, useState } from 'react';
import { useInvestments } from '@/hooks/use-investments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { AppSettings } from '@/lib/types';

const months = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export default function SettingsPage() {
  const { appSettings, updateAppSettings, isLoading: isLoadingContext } = useInvestments();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (appSettings?.financialYearStartMonth) {
      setSelectedMonth(String(appSettings.financialYearStartMonth));
    } else if (!isLoadingContext && !appSettings?.financialYearStartMonth) {
      setSelectedMonth('1'); // Default to January if no setting exists and not loading
    }
  }, [appSettings, isLoadingContext]);

  const handleSaveSettings = async () => {
    if (!selectedMonth) {
      toast({
        title: "Error",
        description: "Please select a financial year start month.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      const newSettings: Partial<AppSettings> = {
        financialYearStartMonth: parseInt(selectedMonth, 10),
      };
      await updateAppSettings(newSettings);
      toast({
        title: "Settings Saved",
        description: "Your financial settings have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error Saving Settings",
        description: error.message || "Could not save your settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const isLoading = isLoadingContext && selectedMonth === undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">Adjust your financial settings, such as your financial year start month and other preferences.</p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Financial Settings</CardTitle>
          <CardDescription>Configure your financial year preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading settings...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="financial-year-start-month" className="text-sm font-medium">
                Financial Year Start Month
              </label>
              <Select
                value={selectedMonth}
                onValueChange={setSelectedMonth}
              >
                <SelectTrigger id="financial-year-start-month" className="w-full md:w-[280px]">
                  <SelectValue placeholder="Select a month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={String(month.value)}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the month your financial year begins.
              </p>
            </div>
          )}

          <Button onClick={handleSaveSettings} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
       {/* Future settings sections can be added here */}
    </div>
  );
}
