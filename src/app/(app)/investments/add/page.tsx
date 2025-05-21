import { AddInvestmentForm } from '@/components/investments/add-investment-form';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

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
