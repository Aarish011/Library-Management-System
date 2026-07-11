import { useCallback, useEffect, useState } from 'react';

export function useActionCooldown(durationMs = 5000) {
  const [availableAt, setAvailableAt] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (now >= availableAt) return undefined;
    const intervalId = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, [availableAt, now]);

  const remainingMs = Math.max(0, availableAt - now);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const isCoolingDown = remainingMs > 0;

  const startCooldown = useCallback(
    (nextDurationMs = durationMs) => {
      setAvailableAt(Date.now() + nextDurationMs);
      setNow(Date.now());
    },
    [durationMs]
  );

  const resetCooldown = useCallback(() => {
    setAvailableAt(0);
    setNow(Date.now());
  }, []);

  const guard = useCallback(
    (message) => {
      const remaining = Math.ceil(Math.max(0, availableAt - Date.now()) / 1000);
      if (remaining > 0) {
        if (message) message(remaining);
        return false;
      }
      return true;
    },
    [availableAt]
  );

  return {
    isCoolingDown,
    remainingSeconds,
    startCooldown,
    resetCooldown,
    guard,
  };
}

export default useActionCooldown;
