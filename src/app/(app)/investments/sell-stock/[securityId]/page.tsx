
"use client";

import { SellStockForm } from '@/components/investments/stocks/sell-stock-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useListedSecurities } from '@/hooks/use-listed-securities';
import { useParams } from 'next/navigation';
import { useForm } from '@/contexts/form-context';
import type { ListedSecurity } from '@/lib/types';

export default function SellSecurityPage() {
  const params = useParams();
  const securityId = params.securityId as string;
  const { listedSecurities, isLoading } = useListedSecurities();
  const [security, setSecurity] = useState<ListedSecurity | null>(null);
  const { setHeaderProps, openForm, closeForm } = useForm();

  // Set up header props when component mounts and when security is loaded
  useEffect(() => {
    openForm();
    
    if (security) {
      const pageTitle = `Sell: ${security.name} ${security.securityType === 'Fund' ? `(${security.fundType})` : ''}`;
      
      setHeaderProps({
        showBackButton: true,
        backHref: `/securities/details/${securityId}`,
        backLabel: 'Back to Security Details',
        title: 'Sell Order',
        showNavControls: false
      });
    }
    
    // Clean up when component unmounts
    return () => {
      closeForm();
    };
  }, [security, securityId, setHeaderProps, openForm, closeForm]);

  // Fetch security data
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

  return (
    <div className="container mx-auto">
      <Card>
        <CardHeader>
          {security?.description && <CardDescription> {security.description} </CardDescription>}
        </CardHeader>
        <CardContent>
          <SellStockForm securityId={security.id} />
        </CardContent>
      </Card>
    </div>
  );
}
