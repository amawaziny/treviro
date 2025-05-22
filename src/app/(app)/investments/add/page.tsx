
"use client"; // This page needs to be a client component to use next/dynamic with ssr:false

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import AddInvestmentForm with ssr: false
// The component itself (AddInvestmentForm) must also be marked with "use client";
const AddInvestmentForm = dynamic(() => 
  import('@/components/investments/add-investment-form').then(mod => mod.AddInvestmentForm),
  { 
    ssr: false,      // Ensure this component is only rendered on the client
    suspense: true,  // This will use the <Suspense> boundary below
    // loading: () => <AddInvestmentLoadingFallback /> // Alternative if suspense:true is not used directly
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
