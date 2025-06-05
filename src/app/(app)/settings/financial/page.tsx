
"use client";

// This page is no longer used.
// Settings are now managed at /settings.
// This file can be removed in the future if no longer referenced.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function DeprecatedFinancialSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Old Financial Settings</h1>
        <p className="text-muted-foreground">This page is no longer in use.</p>
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Page Deprecated</CardTitle>
          <CardDescription>
            Financial settings, including the financial year start month, are now managed on the main {" "}
            <Link href="/settings" className="underline text-primary">Settings page</Link>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please use the new settings page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
