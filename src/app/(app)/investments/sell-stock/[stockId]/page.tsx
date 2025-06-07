
"use client";

import { SellStockForm } from '@/components/investments/sell-stock-form'; // Component name is kept for now
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useParams, useRouter } from 'next/navigation';
import { useListedSecurities } from '@/hooks/use-listed-securities'; // Updated hook
import React, { useEffect, useState } from 'react';
import type { ListedSecurity } from '@/lib/types'; // ListedStock -> ListedSecurity

export default function SellSecurityPage({ params }: { params: { securityId: string } }) { // securityId is securityId
  const securityId = params.securityId;
  const router = useRouter();
  const { getListedSecurityById, isLoading: isLoadingListedSecurities } = useListedSecurities();
  const [securityBeingSold, setSecurityBeingSold] = useState<ListedSecurity | null>(null);
  const [loadingTitle, setLoadingTitle] = useState(true);

  useEffect(() => {
    if (securityId) {
      setLoadingTitle(true);
      getListedSecurityById(securityId).then(data => {
        setSecurityBeingSold(data || null);
        setLoadingTitle(false);
      });
    } else {
      setLoadingTitle(false);
    }
  }, [securityId, getListedSecurityById]);

  const pageTitle = securityBeingSold 
    ? `Sell: ${securityBeingSold.name} ${securityBeingSold.securityType === 'Fund' ? `(${securityBeingSold.fundType})` : ''}` 
    : "Sell Security";


  return (
    <div className="container mx-auto py-8 space-y-6">
       <Button variant="outline" size="sm" asChild className="mb-4">
         {/* Link back to the main securities detail page */}
        <Link href={`/securities/details/${securityId}`}> 
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Security Details
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>
            {loadingTitle ? <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> : pageTitle}
          </CardTitle>
          <CardDescription>Record the sale of your security holdings.</CardDescription>
        </CardHeader>
        <CardContent>
          {(isLoadingListedSecurities && !securityBeingSold) || loadingTitle ? (
             <div className="flex items-center justify-center py-10">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading security details...
             </div>
          ) : (
            <SellStockForm securityId={securityId} /> // securityId prop for SellStockForm now means securityId
          )}
        </CardContent>
      </Card>
    </div>
  );
}
