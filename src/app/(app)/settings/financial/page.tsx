
"use client";

// This page is no longer used for setting estimated living expenses, Zakat, or Charity.
// These concepts are now integrated into logging individual expenses and managing fixed estimates on the Expenses page.
// This page can be repurposed or removed. For now, I'll leave a placeholder.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function FinancialSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Settings</h1>
        <p className="text-muted-foreground">Manage your financial preferences.</p>
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Settings Overview</CardTitle>
          <CardDescription>Fixed monthly estimates for Living Expenses, Zakat, and Charity are now managed on the "Expenses" page. This page can be used for other application-wide settings in the future.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No settings available here at the moment.</p>
        </CardContent>
      </Card>
    </div>
  );
}
