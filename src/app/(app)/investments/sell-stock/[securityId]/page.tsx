
"use client";

import { SellStockForm } from '@/components/investments/stocks/sell-stock-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useListedSecurities } from '@/hooks/use-listed-securities';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import type { ListedSecurity } from '@/lib/types';

export default function SellSecurityPage() {
  const params = useParams();
  const securityId = params.securityId as string;
  const { listedSecurities, isLoading } = useListedSecurities();
  const [security, setSecurity] = useState<ListedSecurity | null>(null);

  useEffect(() => {
    if (listedSecurities.length > 0) {
      const foundSecurity = listedSecurities.find(s => s.id === securityId);
      setSecurity(foundSecurity || null);
    }
  }, [listedSecurities, securityId]);

  if (isLoading || !security) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const pageTitle = `Sell: ${security.name} ${security.securityType === 'Fund' ? `(${security.fundType})` : ''}`;

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href={`/securities/details/${securityId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Security Details
        </Link>
      </Button>
      <h1 className="text-2xl font-bold mb-6">{pageTitle}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Sell Order</CardTitle>
          <CardDescription>
            {security?.description ? String(security.description) : 'No description available'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SellStockForm securityId={security.id} />
        </CardContent>
      </Card>
    </div>
  );
}
