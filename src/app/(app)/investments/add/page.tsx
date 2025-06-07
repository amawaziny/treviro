"use client"; // This page needs to be a client component to use next/dynamic with ssr:false

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'; // Import icons
import { useSearchParams } from 'next/navigation'; // Import hook
import { useListedSecurities } from '@/hooks/use-listed-securities'; // Import hook
import type { ListedSecurity } from '@/lib/types'; // Import type
import { useLanguage } from '@/contexts/language-context'; // Import hook

import { Button } from '@/components/ui/button';

// Define a simple loading fallback for the Suspense boundary
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
      Loading...
    </div>
  );
}

// Dynamically import AddInvestmentForm with ssr: false
// The component itself (AddInvestmentForm) must also be marked with "use client";
// We can remove the suspense: true here if the parent handles suspense
const AddInvestmentForm = dynamic(
  () =>
    import('@/components/investments/add-investment-form').then(
      (mod) => mod.AddInvestmentForm
    ),
  { 
    ssr: false,      // Ensure this component is only rendered on the client
    // suspense: true,  // Removed, parent Suspense handles this
    loading: () => <PageLoadingFallback /> // Use a loading component if needed within dynamic import
  }
);

export default function AddInvestmentPage() {
  return (
    <div className="container mx-auto py-8">
      {/* Wrap the content that uses useSearchParams in Suspense */}
      <Suspense fallback={<PageLoadingFallback />}>
        <AddInvestmentPageContent />
      </Suspense>
    </div>
  );
}

// Extract the component logic that uses hooks into a new component
function AddInvestmentPageContent() {
  const searchParams = useSearchParams();
  const securityId = searchParams.get('securityId');
  const { language } = useLanguage();

  const { getListedSecurityById, isLoading: isLoadingListedSecurities } = useListedSecurities();
  const [security, setSecurity] = useState<ListedSecurity | null>(null);

  useEffect(() => {
    if (securityId) {
      // Assuming getListedSecurityById can handle both stock and fund IDs if they share a namespace
      // If not, additional logic might be needed based on security type from URL if available
      getListedSecurityById(securityId).then(data => {
        setSecurity(data || null);
      });
    }
  }, [securityId, getListedSecurityById]);

  const BackArrowIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  // Only show the back button if we have a securityId and the security details are loaded
  const showBackButton = securityId && security && !isLoadingListedSecurities;

  return (
    <>
      <div className="mb-6">
        {showBackButton ? (
          <Link href={`/securities/details/${security.id}`} passHref>
            <Button variant="outline" size="sm">
              <BackArrowIcon className={language === 'ar' ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
              Back to {security.name}
            </Button>
          </Link>
        ) : (
          <Link href="/investments" passHref>
            <Button variant="outline" size="sm">
              <BackArrowIcon className={language === 'ar' ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
              Back to Investments
            </Button>
          </Link>
        )}
      </div>
      
      {/* The dynamically imported form, already set up for SSR=false and suspense */}
      <AddInvestmentForm />
    </>
  );
}
