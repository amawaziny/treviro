
"use client";

import { FinancialSettingsForm } from '@/components/settings/financial-settings-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function FinancialSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Settings</h1>
        <p className="text-muted-foreground">Manage your financial preferences and estimates.</p>
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Monthly Estimates</CardTitle>
          <CardDescription>Set your estimated monthly living expenses. This will be used in cash flow calculations.</CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialSettingsForm />
        </CardContent>
      </Card>
    </div>
  );
}
