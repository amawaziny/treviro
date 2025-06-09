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
import { Plus, PiggyBank } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatNumberWithSuffix } from '@/lib/utils';
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
import { Pencil, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { IncomeRecord } from '@/lib/types';

export default function IncomePage() {
  // UI state for filters
  const [showAll, setShowAll] = React.useState(false); // false = this month, true = all

  const { incomeRecords, isLoading, deleteIncomeRecord } = useInvestments();
  if (!deleteIncomeRecord) {
    throw new Error('deleteIncomeRecord function is required but not provided by useInvestments');
  }
  const { language } = useLanguage();
  const isMobile = useIsMobile();

  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  // Filtering logic for income
  const filteredIncome = React.useMemo(() => {
    const recordsToFilter = incomeRecords || [];
    const currentMonth = currentMonthStart.getMonth();
    const currentYear = currentMonthStart.getFullYear();
    const now = new Date();
    
    return recordsToFilter.filter(record => {
      // If not showAll, only show income from this month
      if (!showAll && record.date) {
        return isWithinInterval(new Date(record.date), { start: currentMonthStart, end: currentMonthEnd });
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incomeRecords, currentMonthStart, currentMonthEnd, showAll]);

  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Handle potential "Invalid Date" if dateString is not a valid ISO format
      // Firestore serverTimestamp might initially be null before server populates it,
      // or client-set dates could be in various formats.
      // For robustness, ensure it's a valid date.
      if (isNaN(date.getTime())) return dateString; // Or 'Invalid Date'
      return format(date, 'dd-MM-yyyy');
    } catch (e) {
      return dateString; // Or 'Error formatting date'
    }
  };

  const formatCurrencyEGP = (value: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const formatCurrencyEGPWithSuffix = (value: number) => {
    const formattedNumber = formatNumberWithSuffix(value);
    return `EGP ${formattedNumber}`;
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
        <h1 className="text-xl font-bold tracking-tight text-foreground">Income Management</h1>
        <p className="text-muted-foreground text-sm">Log and manage all your income sources, including salaries, gifts, and other earnings.</p>
      </div>
      <Separator />

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={showAll}
            onCheckedChange={setShowAll}
            id="show-all-switch"
          />
          <span>Show All Income</span>
        </label>
      </div>

      {filteredIncome.length > 0 ? (
        <>
          {/* Summary Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PiggyBank className="mr-2 h-6 w-6 text-primary" />
                {showAll ? 'Total Income (All)' : 'Total Income This Month'}
              </CardTitle>
              <CardDescription>
                {showAll
                  ? "View and manage all your recorded income sources."
                  : `See and manage all income received in ${format(new Date(), 'MMMM yyyy')}.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-foreground">
                {formatCurrencyEGP(filteredIncome.reduce((sum, r) => sum + r.amount, 0))}
              </span>
            </CardContent>
          </Card>

          <div className="grid gap-4 mt-8">
            {filteredIncome.map(record => (
              <Card key={record.id} className="">
                <CardContent className="flex flex-col md:flex-row md:items-start md:items-center justify-between gap-6 py-4">
                  {/* Main Info Column */}
                  <div className="flex-1 min-w-0">
                    {/* Top Row: Title, Date */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold truncate text-base">
                        {record.description || record.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateDisplay(record.date)}
                      </span>
                    </div>
                    {/* Amount and Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-2xl font-bold">
                        {formatCurrencyEGP(record.amount)}
                      </span>
                    </div>
                  </div>
                  {/* Actions Column */}
                  <div className="flex flex-col items-end gap-2 min-w-[56px] mt-2 md:mt-0">
                    <Link href={`/income/edit/${record.id}`} passHref legacyBehavior>
                      <Button variant="ghost" size="icon" className="mb-1" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove {record.description || record.type}</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will permanently delete this income record. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                              try {
                                await deleteIncomeRecord(record.id);
                              } catch (e) {
                                console.error('Error deleting income record:', e);
                              }
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PiggyBank className="mr-2 h-6 w-6 text-primary" />
              No Income Recorded This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-4 text-center">
              You haven't added any income records for {format(new Date(), 'MMMM yyyy')} yet.
            </p>
          </CardContent>
        </Card>
      )}

      <Link href="/income/add" passHref>
        <Button
          variant="default"
          size="icon"
          className={`fixed bottom-8 h-14 w-14 rounded-full shadow-lg z-50 ${
            language === 'ar' ? 'left-8' : 'right-8'
          }`}
          aria-label="Add new income record"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
