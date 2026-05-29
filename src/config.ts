// Application Configuration
export const API_HOST = 'https://ais-pre-vy6y7ydsggrxbpqck5vwhe-726853785837.asia-southeast1.run.app';

export const getApiUrl = (path: string): string => {
  // If running inside Capacitor mobile app (Android / iOS), use absolute URL of the hosted backend server
  // Otherwise, fallback to relative path (suitable for local vite dev and web deployment)
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
  const isNative = isCapacitor && (window as any).Capacitor.getPlatform && (window as any).Capacitor.getPlatform() !== 'web';
  const base = isNative ? API_HOST : '';
  return `${base}${path}`;
};
