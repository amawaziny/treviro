import React from "react";
import { useOffline } from "@/hooks/useOffline";

const OfflineIndicator: React.FC = () => {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-md shadow-lg flex items-center">
      <svg
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>You are currently offline. Some features may be limited.</span>
    </div>
  );
};

export default OfflineIndicator;
