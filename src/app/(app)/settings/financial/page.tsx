
"use client";

// This page is no longer used for setting estimated living expenses, Zakat, or Charity.
// These concepts are now integrated into logging individual expenses.
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
          <CardDescription>This section can be used for future financial settings if needed. Estimated monthly expenses are now logged directly in the Expenses section.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No settings available here at the moment.</p>
          {/* FinancialSettingsForm component is removed as it's no longer needed for its previous purpose */}
        </CardContent>
      </Card>
    </div>
  );
}
