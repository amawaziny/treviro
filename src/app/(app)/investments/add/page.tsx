"use client"; // This page needs to be a client component to use next/dynamic with ssr:false

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'; // Import icons
import { useSearchParams } from 'next/navigation'; // Import hook
import { useListedSecurities } from '@/hooks/use-listed-securities'; // Import hook
import type { ListedSecurity } from '@/lib/types'; // Import type
import { useLanguage } from '@/contexts/language-context'; // Import hook

import { useForm } from '@/contexts/form-context';

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
    <div className="flex flex-col">
      <Suspense fallback={<PageLoadingFallback />}>
        <AddInvestmentPageContent />
      </Suspense>
    </div>
  );
}

// Extract the component logic that uses hooks into a new component
function AddInvestmentPageContent() {
  // All hooks must be called at the top level, before any conditional returns
  const searchParams = useSearchParams();
  const securityId = searchParams.get('securityId');
  const { language } = useLanguage();
  const { setHeaderProps } = useForm();
  const { getListedSecurityById, isLoading: isLoadingListedSecurities } = useListedSecurities();
  const [security, setSecurity] = useState<ListedSecurity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up header props effect
  useEffect(() => {
    setHeaderProps({
      showBackButton: true,
      backHref: securityId && security ? `/securities/details/${security.id}` : '/investments',
      backLabel: security ? `Back to ${security.name}` : 'Back to Investments',
      title: 'Buy Debt Instrument',
      showNavControls: false
    });

    // Clean up when component unmounts
    return () => {
      setHeaderProps({
        showBackButton: false
      });
    };
  }, [securityId, security, setHeaderProps]);

  // Fetch security data
  useEffect(() => {
    const fetchSecurity = async () => {
      if (securityId) {
        try {
          const data = await getListedSecurityById(securityId);
          setSecurity(data || null);
        } catch (error) {
          console.error('Error fetching security:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchSecurity();
  }, [securityId, getListedSecurityById]);

  if (isLoading) {
    return <PageLoadingFallback />;
  }

  return (
    <div className="container mx-auto py-8 flex-1">
      <AddInvestmentForm />
    </div>
  );
}
