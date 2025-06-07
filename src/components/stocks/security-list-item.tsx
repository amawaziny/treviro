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
    minimumFractionDigits: 3, // Changed to 3
    maximumFractionDigits: 3, // Changed to 3
  }).format(security.price);

  const isPositiveChange = security.changePercent >= 0;

  const detailPageLink = `/securities/${security.id}?previousTab=${currentTab}`;

  return (
    <Link href={detailPageLink} passHref>
      <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer rounded-lg shadow-sm">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <Image
            src={security.logoUrl || 'https://placehold.co/40x40.png'}
            alt={`${security.name} logo`}
            width={40}
            height={40}
            className="rounded-full object-cover flex-shrink-0 mt-1"
            data-ai-hint={security.securityType === 'Fund' ? "fund logo" : "company logo"}
          />
          
          {/* Left Column: Symbol and Name */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">{security.symbol}</p>
            <p className="text-xs text-muted-foreground truncate">
              {security.name.length > 25 ? `${security.name.substring(0, 22)}...` : security.name}
              <span className="mx-1">•</span>
              {security.market.toUpperCase()}
              {security.securityType === 'Fund' && security.fundType && (
                <span className="ml-1 text-primary">({security.fundType})</span>
              )}
            </p>
          </div>

          {/* Right Column: Price and Change */}
          <div className="flex flex-col items-end">
            <p className="text-sm sm:text-base font-semibold text-foreground whitespace-nowrap">
              {formattedPrice} <span className="text-xs text-muted-foreground">{security.currency}</span>
            </p>
            <Badge
              variant={isPositiveChange ? 'default' : 'destructive'}
              className={cn(
                isPositiveChange ? 'bg-accent text-accent-foreground' : 'bg-destructive text-destructive-foreground',
                'text-xs px-2 py-0.5 mt-1 whitespace-nowrap'
              )}
            >
              {security.changePercent.toFixed(2)}%
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
});
SecurityListItem.displayName = 'SecurityListItem';
