import { useState, useEffect } from 'react';

/** Ticks every second, returning the current Date. */
export function useClockTick() {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return currentTime;
}
