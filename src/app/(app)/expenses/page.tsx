
"use client";

import React from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useInvestments } from '@/hooks/use-investments';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExpenseRecord } from '@/lib/types';
// Removed FinancialSettingsForm import as its functionality is moved

export default function ExpensesPage() {
  const { expenseRecords, isLoading, deleteExpenseRecord } = useInvestments(); // Removed monthlySettings
  const { language } = useLanguage();

  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  const expensesThisMonth = React.useMemo(() => {
    const recordsToFilter = expenseRecords || [];
    const currentMonth = currentMonthStart.getMonth();
    const currentYear = currentMonthStart.getFullYear();
    
    // For each record, determine if it should appear this month
    return recordsToFilter.flatMap(record => {
      if (
        record.category === 'Credit Card' &&
        record.isInstallment &&
        record.numberOfInstallments &&
        record.date
      ) {
        // Calculate the months covered by the installment
        const startDate = new Date(record.date);
        const startMonth = startDate.getMonth();
        const startYear = startDate.getFullYear();
        const installmentMonths = record.numberOfInstallments;
        // Calculate the month index (0-based) for the current month in the installment plan
        const monthsSinceStart = (currentYear - startYear) * 12 + (currentMonth - startMonth);
        if (monthsSinceStart >= 0 && monthsSinceStart < installmentMonths) {
          // For display, return a row object with both original and required amount
          return [{
            ...record,
            _originalAmount: record.amount,
            _requiredAmount: record.amount / record.numberOfInstallments,
            installmentMonthIndex: monthsSinceStart + 1, // for display (1-based)
            installmentMonthsTotal: installmentMonths,
            installmentStartDate: startDate,
          }];
        } else {
          return [];
        }
      } else if (record.date && isWithinInterval(new Date(record.date), { start: currentMonthStart, end: currentMonthEnd })) {
        // Non-installment or non-credit card expense, use normal logic
        return [{ ...record, _originalAmount: record.amount, _requiredAmount: record.amount }];
      } else {
        return [];
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenseRecords, currentMonthStart, currentMonthEnd]);

  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; 
      return format(date, 'dd-MM-yyyy');
    } catch (e) {
      return dateString; 
    }
  };

  const formatCurrencyEGP = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'EGP 0.00';
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const formatNumberWithSuffix = (num: number | undefined): string => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    if (num === 0) return '0';
    const absNum = Math.abs(num);
    if (absNum >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (absNum >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (absNum >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toFixed(2).replace(/\.00$/, ''); // Keep two decimal places for smaller numbers
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Separator />
        {/* Removed skeleton for Monthly Fixed Estimates card */}
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
        <p className="text-muted-foreground">Log your itemized expenses. Fixed estimates (Salary, Zakat, Charity) are now managed on the "Fixed Estimates" page.</p>
      </div>
      <Separator />

      {/* Removed the Card for Monthly Fixed Estimates that rendered FinancialSettingsForm */}

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
                  <TableHead className="text-right">Original Amount</TableHead>
                  <TableHead className="text-right">Required This Month</TableHead>
                  <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Installment Info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesThisMonth.map((record: ExpenseRecord) => (
                  <TableRow key={record.id}>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{formatDateDisplay(record.date)}</TableCell>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{record.category}</TableCell>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{record.description || 'N/A'}</TableCell>
                    <TableCell className="text-right">{formatCurrencyEGP(record._originalAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrencyEGP(record._requiredAmount)}</TableCell>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left', 'text-sm')}>
                      {record.isInstallment && record.numberOfInstallments && record.category === 'Credit Card' ? (
                        <span className="flex items-center justify-end md:justify-start">
                          {window.innerWidth < 768
                            ? `${formatCurrencyEGP(record.amount / record.numberOfInstallments)} / month`
                            : `${formatCurrencyEGP(record.amount / record.numberOfInstallments)} x ${record.numberOfInstallments} months`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                         N/A
                        </span>
                      )}
                     </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/expenses/edit/${record.id}`} passHref legacyBehavior>
                        <Button variant="ghost" size="icon" className="mr-2" aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove {record.description || record.category}</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will permanently delete this expense record. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                try {
                                  await deleteExpenseRecord(record.id);
                                } catch (e) {
                                  // Optionally show toast or ignore
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
