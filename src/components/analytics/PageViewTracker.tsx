'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';

const PageViewTracker = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      // Track page view when pathname changes
      const pageTitle = document.title || pathname.split('/').pop() || 'Home';
      const pagePath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      
      trackPageView(pageTitle, pagePath);
    }
  }, [pathname, searchParams]);

  return null; // This component doesn't render anything
};

export default PageViewTracker;
