import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { setAnalyticsUserId, trackEvent } from '@/lib/analytics';

export function useAnalytics() {
  const { user } = useAuth();

  // Track user login/logout
  useEffect(() => {
    if (user) {
      // Set user ID for analytics tracking
      setAnalyticsUserId(user.uid);
      
      // Track login event
      trackEvent('login', {
        method: 'email', // or 'google', 'github', etc.
      });
    } else {
      // Track logout event
      trackEvent('logout');
    }
  }, [user]);

  // Utility function to track custom events
  const track = (eventName: string, params?: Record<string, any>) => {
    trackEvent(eventName, {
      ...params,
      userId: user?.uid || 'anonymous',
    });
  };

  return { track };
}
