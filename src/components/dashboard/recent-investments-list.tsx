
"use client";

import React from 'react'; 
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
import { Badge } from "@/components/ui/badge";
import { useInvestments } from "@/hooks/use-investments";
import type { Investment } from "@/lib/types";
import { Landmark, Coins, LineChart, FileText, CircleDollarSign } from 'lucide-react';
import Link from "next/link";
import { Button } from "../ui/button";
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';

const investmentTypeIcons = {
  'Real Estate': Landmark,
  'Gold': Coins,
  'Stocks': LineChart,
  'Debt Instruments': FileText,
  'Currencies': CircleDollarSign,
};


const InvestmentRow = React.memo(function InvestmentRow({ investment, language }: { investment: Investment, language: 'en' | 'ar' }) {
  const Icon = investmentTypeIcons[investment.type] || CircleDollarSign;
  const formattedAmount = new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(investment.amountInvested);
  
  let formattedDate = 'N/A';
  if (investment.purchaseDate) {
    try {
      const date = new Date(investment.purchaseDate);
      if (!isNaN(date.getTime())) {
        formattedDate = format(date, 'dd-MM-yyyy');
      }
    } catch (e) {
      // Keep 'N/A' if date parsing fails
    }
  }

  return (
    <TableRow>
      <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>
        <div className={cn("flex items-center gap-2", language === 'ar' ? 'flex-row-reverse' : '')}>
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium truncate max-w-[120px] sm:max-w-[200px] md:max-w-[300px] block" title={investment.name}>{investment.name}</span>
        </div>
      </TableCell>
      <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>
        <Badge variant="secondary">{investment.type}</Badge>
      </TableCell>
      <TableCell className="text-right">{formattedAmount}</TableCell>
      <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{formattedDate}</TableCell>
    </TableRow>
  );
});
InvestmentRow.displayName = 'InvestmentRow'; 

export function RecentInvestmentsList() {
  const { investments, isLoading } = useInvestments();
  const { language } = useLanguage();

  const recentInvestments = investments.slice(-5).reverse();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Investments</CardTitle>
          <CardDescription>Your latest investment entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading recent investments...</p>
        </CardContent>
      </Card>
    );
  }

  if (investments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Investments</CardTitle>
          <CardDescription>Your latest investment entries.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <p className="text-muted-foreground mb-4">No investments recorded yet.</p>
          <Button asChild>
            <Link href="/investments/add">Add Your First Investment</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Investments</CardTitle>
        <CardDescription>Your latest investment entries.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Name</TableHead>
              <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Type</TableHead>
              <TableHead className="text-right">Amount Invested</TableHead>
              <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Purchase Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentInvestments.map((investment) => (
              <InvestmentRow key={investment.id} investment={investment} language={language} />
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}
