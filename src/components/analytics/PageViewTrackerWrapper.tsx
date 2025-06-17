'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const PageViewTracker = dynamic(
  () => import('./PageViewTracker'),
  { ssr: false }
);

export default function PageViewTrackerWrapper() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}
