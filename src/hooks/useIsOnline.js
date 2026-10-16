import { useEffect, useState } from 'react';

// Статус сети для индикатора в хедере. navigator.onLine — best-effort: может быть
// true без реального соединения, поэтому это только индикатор, не источник правды.
export function useIsOnline() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return isOnline;
}