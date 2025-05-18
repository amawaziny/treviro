import { Coins } from 'lucide-react';

export default function Loading() {
  // This UI will be shown by Next.js during page navigations
  // when new route segments are loading.
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Coins className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading page...</p>
      </div>
    </div>
  );
}
