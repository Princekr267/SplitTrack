import { useState, useEffect } from 'react';

/**
 * Hook to detect whether the user's primary pointer supports hover.
 * Evaluates '(hover: hover) and (pointer: fine)'.
 * Returns false on touch devices (phones, tablets) so hover states do not stick.
 */
export function useHoverCapable() {
  const [isHoverCapable, setIsHoverCapable] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const handleChange = (e) => setIsHoverCapable(e.matches);

    setIsHoverCapable(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      // Legacy browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return isHoverCapable;
}

export default useHoverCapable;
