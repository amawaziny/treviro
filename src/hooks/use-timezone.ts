import { useState, useEffect } from 'react';

export function useTimeZone() {
  const [timeZone, setTimeZone] = useState<string>('Africa/Cairo');

  useEffect(() => {
    try {
      // This will only run on the client side
      const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimeZone(detectedTimeZone);
    } catch (error) {
      console.warn('Could not detect timezone, falling back to Africa/Cairo');
      setTimeZone('Africa/Cairo');
    }
  }, []);

  return timeZone;
}