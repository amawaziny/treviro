import { usePathname } from 'next/navigation';

export function useIsDetailsPage() {
  const pathname = usePathname();
  return pathname?.includes('/details/');
}
