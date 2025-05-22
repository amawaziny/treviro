
"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import AddInvestmentForm with ssr: false
const AddInvestmentForm = dynamic(() => 
  import('@/components/investments/add-investment-form').then(mod => mod.AddInvestmentForm),
  { 
    suspense: true, // This will use the <Suspense> boundary below
    ssr: false      // Ensure this component is only rendered on the client
  }
);

function AddInvestmentLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
      Loading form...
    </div>
  );
}

export default function AddInvestmentPage() {
  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<AddInvestmentLoadingFallback />}>
        <AddInvestmentForm />
      </Suspense>
    </div>
  );
}
