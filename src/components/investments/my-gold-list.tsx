"use client";

import React from 'react';
import { useInvestments } from '@/hooks/use-investments';
import type { Investment } from '@/lib/types'; // Assuming a general Investment type exists
import { MyGoldListItem } from './my-gold-list-item';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Package } from "lucide-react"; // Using Package icon as a placeholder
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { isGoldRelatedInvestment } from '@/lib/utils'; // Assuming this utility function exists

export function MyGoldList() {
  const { investments, isLoading: isLoadingInvestments } = useInvestments();

  const goldInvestments = React.useMemo(() => {
    // Filter investments to include only gold-related ones
    return investments.filter(inv => isGoldRelatedInvestment(inv));
  }, [investments]);

  if (isLoadingInvestments) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (goldInvestments.length === 0) {
    return (
      <Alert>
        <Package className="h-4 w-4" />
        <AlertTitle>No Gold Holdings Yet!</AlertTitle>
        <AlertDescription>
          You haven't added any gold investments to your portfolio.
          {/* TODO: Update this link to point to the add gold investment form */}
          <Button asChild variant="link" className="px-1">
            <Link href="/investments/add?type=Gold">Add your first gold investment</Link>
          </Button>
           .
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {goldInvestments.map(holding => (
        // Cast to GoldInvestment type if necessary, ensure MyGoldListItem can handle it
        <MyGoldListItem key={holding.id} holding={holding as any} /> 
      ))}
    </div>
  );
}
