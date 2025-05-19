
"use client"; // Ensure this is a client component if using hooks like useInvestments

import { InvestmentDistributionChart } from "@/components/dashboard/investment-distribution-chart";
import { RecentInvestmentsList } from "@/components/dashboard/recent-investments-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useInvestments } from "@/hooks/use-investments"; // Assuming this hook provides dashboardSummary
import { TrendingUp, TrendingDown, DollarSign, Landmark, LineChart as LucideLineChart } from "lucide-react"; // Added icons
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { dashboardSummary, isLoading } = useInvestments();

  const totalInvested = dashboardSummary?.totalInvestedAcrossAllAssets ?? 0;
  const totalRealizedPnL = dashboardSummary?.totalRealizedPnL ?? 0;

  // Format currency function
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your investment portfolio.</p>
      </div>
      
      <Separator />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invested Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4 mt-1" />
            ) : (
              <p className="text-3xl font-bold">{formatCurrency(totalInvested)}</p>
            )}
            <p className="text-xs text-muted-foreground">Sum of all purchase costs.</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Realized P/L</CardTitle>
            {totalRealizedPnL >= 0 ? <TrendingUp className="h-4 w-4 text-accent" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </CardHeader>
          <CardContent>
             {isLoading ? (
              <Skeleton className="h-8 w-3/4 mt-1" />
            ) : (
              <p className={`text-3xl font-bold ${totalRealizedPnL >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {formatCurrency(totalRealizedPnL)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Profit/Loss from all completed sales.</p>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Portfolio Value</CardTitle>
            <LucideLineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <p className="text-3xl font-bold text-muted-foreground/70">(Coming Soon)</p>
            <p className="text-xs text-muted-foreground">Unrealized P/L and market value.</p>
          </CardContent>
        </Card>

         <Card className="lg:col-span-3"> {/* Chart spans full width on smaller, or 2/3 on larger */}
            <InvestmentDistributionChart />
        </Card>
      </div>

      <div>
        <RecentInvestmentsList />
      </div>
    </div>
  );
}
