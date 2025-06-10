"use client";

import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useInvestments } from "@/hooks/use-investments";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Settings } from "lucide-react"; // Using Settings icon for title
import { cn } from "@/lib/utils";
import type { FixedEstimateRecord } from "@/lib/types";

export default function FixedEstimatesPage() {
  const { fixedEstimates, isLoading } = useInvestments();
  const { language } = useLanguage();

  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return format(date, "dd-MM-yyyy");
    } catch (e) {
      return dateString;
    }
  };

  const formatCurrencyEGP = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value))
      return "EGP 0.00";
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Separator />
        <Card className="mt-6">
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Fixed Estimates
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your recurring income and expenses like salary, Zakat, and
          charity.
        </p>
      </div>
      <Separator />

      {fixedEstimates.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Your Fixed Estimates</CardTitle>
            <CardDescription>
              A list of your set recurring financial estimates.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className={cn(language === "ar" ? "text-end" : "text-left")}
                  >
                    Type
                  </TableHead>
                  <TableHead
                    className={cn(language === "ar" ? "text-end" : "text-left")}
                  >
                    Name
                  </TableHead>
                  <TableHead className="text-end">Amount</TableHead>
                  <TableHead
                    className={cn(language === "ar" ? "text-end" : "text-left")}
                  >
                    Period
                  </TableHead>
                  <TableHead
                    className={cn(language === "ar" ? "text-end" : "text-left")}
                  >
                    Nature
                  </TableHead>
                  {/* <TableHead className={cn(language === 'ar' ? 'text-left' : 'text-end')}>Actions</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fixedEstimates.map((record: FixedEstimateRecord) => (
                  <TableRow key={record.id}>
                    <TableCell
                      className={cn(
                        language === "ar" ? "text-end" : "text-left",
                      )}
                    >
                      {record.type}
                    </TableCell>
                    <TableCell
                      className={cn(
                        language === "ar" ? "text-end" : "text-left",
                      )}
                    >
                      {record.name || "N/A"}
                    </TableCell>
                    <TableCell className="text-end">
                      {formatCurrencyEGP(record.amount)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        language === "ar" ? "text-end" : "text-left",
                      )}
                    >
                      {record.period}
                    </TableCell>
                    <TableCell
                      className={cn(
                        language === "ar" ? "text-end" : "text-left",
                      )}
                    >
                      {record.isExpense ? "Expense" : "Income"}
                    </TableCell>
                    {/* Actions cell for edit/delete will be added in Phase 2 */}
                    {/* 
                    <TableCell className={cn(language === 'ar' ? 'text-left' : 'text-end')}>
                      <Button variant="ghost" size="icon" disabled> <Edit className="h-4 w-4" /> </Button>
                      <Button variant="ghost" size="icon" disabled> <Trash2 className="h-4 w-4 text-destructive" /> </Button>
                    </TableCell> 
                    */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-4 w-4 text-primary" />
              No Fixed Estimates Set
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-4 text-center">
              You haven't added any fixed estimates yet.
            </p>
          </CardContent>
        </Card>
      )}

      <Link href="/fixed-estimates/add" passHref>
        <Button
          variant="default"
          size="icon"
          className={`fixed bottom-8 h-14 w-14 rounded-full shadow-lg z-50 ${
            language === "ar" ? "left-8" : "right-8"
          }`}
          aria-label="Add new fixed estimate"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
