import { useState, useEffect, useCallback } from "react";

export function usePersistedState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      if (state === defaultValue || (Array.isArray(state) && state.length === 0) || state === null || state === "") {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(state));
      }
    } catch {}
  }, [key, state]);

  const clear = useCallback(() => {
    setState(defaultValue);
    localStorage.removeItem(key);
  }, [key, defaultValue]);

  return [state, setState, clear] as const;
}
