"use client";

import type { ListedStock } from '@/lib/types';
import { StockListItem } from './stock-list-item';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

// Mock data for demonstration
const MOCK_STOCKS: ListedStock[] = [
  { id: '1', name: 'Al Mutaqadimah', symbol: '9565', logoUrl: 'https://placehold.co/40x40.png?text=MR', price: 64.75, currency: 'SAR', changePercent: 9.83, market: 'TADAWUL' },
  { id: '2', name: 'Intl Co for Water', symbol: '9545', logoUrl: 'https://placehold.co/40x40.png?text=HR', price: 6.75, currency: 'SAR', changePercent: 3.85, market: 'TADAWUL' },
  { id: '3', name: 'Miahona', symbol: '2084', logoUrl: 'https://placehold.co/40x40.png?text=MH', price: 26.90, currency: 'SAR', changePercent: 8.21, market: 'TADAWUL' },
  { id: '4', name: 'Solutions by STC', symbol: '7040', logoUrl: 'https://placehold.co/40x40.png?text=STC', price: 101.4, currency: 'SAR', changePercent: 5.41, market: 'TADAWUL' },
  { id: '5', name: 'Ghida Al-Sultan', symbol: '9564', logoUrl: 'https://placehold.co/40x40.png?text=GS', price: 35.0, currency: 'SAR', changePercent: 4.48, market: 'TADAWUL' },
  { id: '6', name: 'Petrolube', symbol: '9609', logoUrl: 'https://placehold.co/40x40.png?text=PL', price: 60.50, currency: 'SAR', changePercent: 4.31, market: 'TADAWUL' },
  { id: '7', name: 'EGX Stock 1', symbol: 'EGX01', logoUrl: 'https://placehold.co/40x40.png?text=E1', price: 120.50, currency: 'EGP', changePercent: -1.15, market: 'EGX' },
  { id: '8', name: 'Cairo Investment', symbol: 'CINV', logoUrl: 'https://placehold.co/40x40.png?text=CI', price: 75.20, currency: 'EGP', changePercent: 2.50, market: 'EGX' },
];

export function StockList() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStocks = useMemo(() => {
    if (!searchTerm) {
      return MOCK_STOCKS;
    }
    return MOCK_STOCKS.filter(stock =>
      stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.market.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search stocks by name, symbol, or market (e.g., EGX, SAR)..."
          className="pl-10 w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {filteredStocks.length > 0 ? (
        <div className="space-y-3">
          {filteredStocks.map(stock => (
            <StockListItem key={stock.id} stock={stock} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-10">No stocks found matching your search.</p>
      )}
    </div>
  );
}
