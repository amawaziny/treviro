
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
import { Plus, TrendingDown, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { ExpenseRecord } from '@/lib/types';

export default function ExpensesPage() {
  const { expenseRecords, isLoading } = useInvestments();
  const { language } = useLanguage();

  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  const expensesThisMonth = React.useMemo(() => {
    return expenseRecords
      .filter(record => isWithinInterval(new Date(record.date), { start: currentMonthStart, end: currentMonthEnd }))
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

  const formatCurrencyEGP = (value: number) => {
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
          <CardContent><Skeleton className="h-24 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Expenses</h1>
        <p className="text-muted-foreground">Track your itemized expenses for {format(new Date(), 'MMMM yyyy')}.</p>
      </div>
      <Separator />

      {expensesThisMonth.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Expenses This Month</CardTitle>
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
                  {/* Add Actions column later if needed for edit/delete */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesThisMonth.map((record: ExpenseRecord) => (
                  <TableRow key={record.id}>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{formatDateDisplay(record.date)}</TableCell>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{record.category}</TableCell>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{record.description}</TableCell>
                    <TableCell className="text-right">{formatCurrencyEGP(record.amount)}</TableCell>
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
              No Expenses Recorded This Month
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
