
"use client";

import React from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useInvestments } from '@/hooks/use-investments';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, TrendingDown, AlertCircle, Landmark, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExpenseRecord } from '@/lib/types';
import { FinancialSettingsForm } from '@/components/settings/financial-settings-form'; // Import the form

export default function ExpensesPage() {
  const { expenseRecords, monthlySettings, isLoading } = useInvestments(); // Get monthlySettings
  const { language } = useLanguage();

  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  const expensesThisMonth = React.useMemo(() => {
    const recordsToFilter = expenseRecords || [];
    return recordsToFilter
      .filter(record => record.date && isWithinInterval(new Date(record.date), { start: currentMonthStart, end: currentMonthEnd }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenseRecords, currentMonthStart, currentMonthEnd]);

  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original string if invalid
      return format(date, 'dd-MM-yyyy');
    } catch (e) {
      return dateString; // Return original string on error
    }
  };

  const formatCurrencyEGP = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'EGP 0.00';
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
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
          <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
          <CardContent><Skeleton className="h-10 w-full mb-4" /></CardContent>
        </Card>
        <Card className="mt-6">
          <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
          <CardContent><Skeleton className="h-24 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Expenses Management</h1>
        <p className="text-muted-foreground">Log your itemized expenses and manage monthly estimates.</p>
      </div>
      <Separator />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Landmark className="mr-2 h-5 w-5 text-primary" />
            Monthly Fixed Estimates
          </CardTitle>
          <CardDescription>Set your recurring estimated monthly expenses. These apply to your Cash Flow calculations each month.</CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialSettingsForm currentSettings={monthlySettings} />
        </CardContent>
      </Card>

      {expensesThisMonth.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Itemized Expenses This Month</CardTitle>
            <CardDescription>A log of your recorded expenses for {format(new Date(), 'MMMM yyyy')}.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Date</TableHead>
                  <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Category</TableHead>
                  <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Installment Info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesThisMonth.map((record: ExpenseRecord) => (
                  <TableRow key={record.id}>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{formatDateDisplay(record.date)}</TableCell>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{record.category}</TableCell>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{record.description || 'N/A'}</TableCell>
                    <TableCell className="text-right">{formatCurrencyEGP(record.amount)}</TableCell>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>
                      {record.isInstallment && record.numberOfInstallments && record.category === 'Credit Card'
                        ? `${(record.amount / record.numberOfInstallments).toFixed(2)} EGP x ${record.numberOfInstallments} months`
                        : 'N/A'}
                    </TableCell>
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
              <TrendingDown className="mr-2 h-6 w-6 text-primary" />
              No Itemized Expenses Recorded This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-4 text-center">
              You haven't added any itemized expenses for {format(new Date(), 'MMMM yyyy')} yet.
            </p>
          </CardContent>
        </Card>
      )}

      <Link href="/expenses/add" passHref>
        <Button
          variant="default"
          size="icon"
          className={`fixed bottom-8 h-14 w-14 rounded-full shadow-lg z-50 ${
            language === 'ar' ? 'left-8' : 'right-8'
          }`}
          aria-label="Add new expense record"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
