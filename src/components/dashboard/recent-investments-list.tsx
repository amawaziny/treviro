
"use client";

import React from 'react'; // Import React
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

const investmentTypeIcons = {
  'Real Estate': Landmark,
  'Gold': Coins,
  'Stocks': LineChart,
  'Debt Instruments': FileText,
  'Currencies': CircleDollarSign,
};

// Memoize InvestmentRow
const InvestmentRow = React.memo(function InvestmentRow({ investment }: { investment: Investment }) {
  const Icon = investmentTypeIcons[investment.type] || CircleDollarSign;
  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(investment.amountInvested); // Assuming USD for display
  const formattedDate = investment.purchaseDate ? format(new Date(investment.purchaseDate), 'dd-MM-yyyy') : 'N/A';

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{investment.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{investment.type}</Badge>
      </TableCell>
      <TableCell className="text-right">{formattedAmount}</TableCell>
      <TableCell>{formattedDate}</TableCell>
    </TableRow>
  );
});
InvestmentRow.displayName = 'InvestmentRow'; // Optional: for better debugging

export function RecentInvestmentsList() {
  const { investments, isLoading } = useInvestments();

  // Show last 5 investments or fewer if not enough
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount Invested</TableHead>
              <TableHead>Purchase Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentInvestments.map((investment) => (
              <InvestmentRow key={investment.id} investment={investment} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
