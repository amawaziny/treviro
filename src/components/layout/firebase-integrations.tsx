
"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics } from '@/lib/firebase'; // Crashlytics is initialized in firebase.ts
import { logEvent } from 'firebase/analytics';

export function FirebaseIntegrations({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Crashlytics is initialized in firebase.ts if supported.
  // Automatic crash collection should start once firebase.ts initializes it.

  useEffect(() => {
    // This effect runs when `analytics` instance becomes available or pathname/searchParams change.
    if (analytics) { 
      const searchParamsString = searchParams.toString();
      const url = pathname + (searchParamsString ? `?${searchParamsString}` : '');
      
      logEvent(analytics, 'page_view', {
        page_path: url,
        // page_title: document.title // You can also log the page title if desired
      });
      // console.log(`Logged page_view: ${url}`);
    }
  }, [pathname, searchParams, analytics]); // Ensure effect re-runs if analytics instance becomes available later

  return <>{children}</>;
}
