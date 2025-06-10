"use client";

// This component is no longer used for Salary, Zakat, Charity.
// This functionality is moved to the new Fixed Estimates feature.
// This file can be deleted or repurposed for other settings.

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FinancialSettingsForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Settings Placeholder</CardTitle>
        <CardDescription>
          Management of Salary, Zakat, and Charity is now handled on the "Fixed
          Estimates" page. This component is currently a placeholder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">No settings here.</p>
      </CardContent>
    </Card>
  );
}
