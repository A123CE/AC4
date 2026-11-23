import { useEffect, useState } from 'react';

/**
 * 统一的减少动效偏好
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(media.matches);

    const handler = (event) => setReduced(event.matches);
    media.addEventListener?.('change', handler);
    return () => media.removeEventListener?.('change', handler);
  }, []);

  return reduced;
}