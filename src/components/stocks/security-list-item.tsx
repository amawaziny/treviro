
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
  currentTab: 'stocks' | 'funds'; // Added prop
}

export const SecurityListItem = React.memo(function SecurityListItem({ security, currentTab }: SecurityListItemProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(security.price);

  const isPositiveChange = security.changePercent >= 0;

  const detailPageLink = `/stocks/${security.id}?previousTab=${currentTab}`;

  return (
    <Link href={detailPageLink} passHref>
      <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer rounded-lg shadow-sm">
        {/* Left Side: Logo and Name/Symbol */}
        <div className="flex items-center gap-3 flex-grow min-w-0">
          <Image
            src={security.logoUrl || 'https://placehold.co/40x40.png'}
            alt={`${security.name} logo`}
            width={40}
            height={40}
            className="rounded-full object-cover"
            data-ai-hint={security.securityType === 'Fund' ? "fund logo" : "company logo"}
          />
          <div className="truncate">
            <p className="font-semibold text-sm text-foreground truncate">{security.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {security.symbol} - {security.market.toUpperCase()}
              {security.securityType === 'Fund' && security.fundType && (
                <span className="ml-1 text-primary">({security.fundType})</span>
              )}
            </p>
          </div>
        </div>

        {/* Right Side: Price and Change Percentage */}
        <div className="flex flex-col items-end text-right pl-2">
          <p className="text-lg font-semibold text-foreground">
            {formattedPrice}
            <span className="ml-1 text-xs text-muted-foreground">{security.currency}</span>
          </p>
          <Badge
            variant={isPositiveChange ? 'default' : 'destructive'}
            className={cn(
              isPositiveChange ? 'bg-accent text-accent-foreground' : 'bg-destructive text-destructive-foreground',
              "mt-1 text-xs" 
            )}
          >
            {isPositiveChange ? '+' : ''}
            {security.changePercent.toFixed(2)}%
          </Badge>
        </div>
      </Card>
    </Link>
  );
});
SecurityListItem.displayName = 'SecurityListItem';
