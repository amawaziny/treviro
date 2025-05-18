import { InvestmentDistributionChart } from "@/components/dashboard/investment-distribution-chart";
import { RecentInvestmentsList } from "@/components/dashboard/recent-investments-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your investment portfolio.</p>
      </div>
      
      <Separator />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Total Investments Value</CardTitle>
            <CardDescription>(Feature coming soon)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">$0.00</p>
            <p className="text-xs text-muted-foreground">+0% from last month</p>
          </CardContent>
        </Card>
         <Card className="lg:col-span-2">
            <InvestmentDistributionChart />
        </Card>
      </div>

      <div>
        <RecentInvestmentsList />
      </div>

      {/* Placeholder for stock transaction specific logs if expanded */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Stock Transactions</CardTitle>
          <CardDescription>Recent stock purchases and sales.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Stock transaction logging coming soon.</p>
        </CardContent>
      </Card> */}
    </div>
  );
}
