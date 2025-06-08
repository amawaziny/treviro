"use client";

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useInvestments } from '@/hooks/use-investments'; // To access incomeRecords
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, PiggyBank, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatNumberWithSuffix } from '@/lib/utils';

export default function IncomePage() {
  const { incomeRecords, isLoading } = useInvestments();
  const { language } = useLanguage();
  const isMobile = useIsMobile();

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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Income</h1>
        <p className="text-muted-foreground text-sm">Record and review your income sources, including salaries, gifts, and other earnings.</p>
      </div>
      <Separator />

      {incomeRecords.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>All Income</CardTitle>
            <CardDescription>A log of your recorded income.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Date</TableHead>
                  <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Type</TableHead>
                  <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Description</TableHead>
                  {/* Add Actions column later if needed */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{formatDateDisplay(record.date)}</TableCell>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{record.type}</TableCell>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{record.source || 'N/A'}</TableCell>
                    <TableCell className="text-right">{isMobile ? formatCurrencyEGPWithSuffix(record.amount) : formatCurrencyEGP(record.amount)}</TableCell>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{record.description || 'N/A'}</TableCell>
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
              <PiggyBank className="mr-2 h-6 w-6 text-primary" />
              No Income Recorded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-4 text-center">
              You haven't added any income records yet.
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
