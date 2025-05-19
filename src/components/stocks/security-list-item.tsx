
"use client";

import Image from 'next/image';
import type { ListedSecurity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React from 'react';
import Link from 'next/link';

interface SecurityListItemProps {
  security: ListedSecurity;
}

export const SecurityListItem = React.memo(function SecurityListItem({ security }: SecurityListItemProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(security.price);

  const isPositiveChange = security.changePercent >= 0;

  return (
    <Link href={`/stocks/${security.id}`} passHref> {/* Still links to /stocks/[id] for detail view */}
      <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer rounded-lg shadow-sm">
        <div className="flex flex-col items-start">
          <Badge
            variant={isPositiveChange ? 'default' : 'destructive'}
            className={cn(
              isPositiveChange ? 'bg-accent text-accent-foreground' : 'bg-destructive text-destructive-foreground',
              "mb-1 text-xs"
            )}
          >
            {isPositiveChange ? '+' : ''}
            {security.changePercent.toFixed(2)}%
          </Badge>
          <p className="text-lg font-semibold text-foreground">
            {formattedPrice}
            <span className="ml-1 text-xs text-muted-foreground">{security.currency}</span>
          </p>
        </div>
        <div className="flex items-center text-right">
          <div className="mr-3">
            <p className="font-semibold text-sm text-foreground">{security.name}</p>
            <p className="text-xs text-muted-foreground">
              {security.symbol} - {security.market.toUpperCase()}
              {security.securityType === 'Fund' && security.fundType && (
                <span className="ml-1 text-primary">({security.fundType})</span>
              )}
            </p>
          </div>
          <Image
            src={security.logoUrl || 'https://placehold.co/40x40.png'}
            alt={`${security.name} logo`}
            width={40}
            height={40}
            className="rounded-full object-cover"
            data-ai-hint={security.securityType === 'Fund' ? "logo fund" : "logo company"}
          />
        </div>
      </Card>
    </Link>
  );
});
SecurityListItem.displayName = 'SecurityListItem';

