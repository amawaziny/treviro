'use client';

import dynamic from 'next/dynamic';

const OfflineIndicator = dynamic(
  () => import('@/components/common/OfflineIndicator'),
  { ssr: false }
);

export default function OfflineIndicatorWrapper() {
  return <OfflineIndicator />;
}
