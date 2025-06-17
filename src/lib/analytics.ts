import { logEvent, setCurrentScreen, setUserId } from "firebase/analytics";
import { analytics } from "./firebase";

// Track page views
export const trackPageView = (pageTitle: string, pagePath: string) => {
  if (typeof window !== "undefined" && analytics) {
    logEvent(analytics, "page_view", {
      page_title: pageTitle,
      page_path: pagePath,
      page_location: window.location.href,
    });
  }
};

// Track custom events
export const trackEvent = (
  eventName: string,
  eventParams?: { [key: string]: any },
) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
  }
};

// Set user ID for analytics (call after user logs in)
export const setAnalyticsUserId = (userId: string) => {
  if (analytics) {
    setUserId(analytics, userId);
  }
};

// Track errors
export const trackError = (error: Error, errorInfo?: any) => {
  if (analytics) {
    logEvent(analytics, "error", {
      error: error.message,
      errorInfo: JSON.stringify(errorInfo),
      stack: error.stack,
    });
  }
};
