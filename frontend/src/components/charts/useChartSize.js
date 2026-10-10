import { useState, useEffect, useRef } from 'react';

/**
 * Hook to measure the rendered pixel width of a container element.
 * Uses ResizeObserver with a small debounce to prevent layout thrashing.
 * Ensures charts compute geometry in real pixels without text stretching.
 *
 * @param {React.RefObject} [externalRef] Optional ref. If omitted, an internal ref is returned.
 * @param {number} [initialWidth=320] Fallback width before mount/measurement.
 * @returns {{ ref: React.RefObject, width: number }}
 */
export function useChartSize(externalRef, initialWidth = 320) {
  const internalRef = useRef(null);
  const targetRef = externalRef || internalRef;
  const [width, setWidth] = useState(initialWidth);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    let timeoutId;
    // Immediate measurement on mount
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) {
      setWidth(Math.round(rect.width));
    }

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || !entries.length) return;
      const entry = entries[0];
      const entryWidth = entry.contentRect.width;

      if (entryWidth > 0) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setWidth(Math.round(entryWidth));
        }, 40);
      }
    });

    observer.observe(el);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [targetRef]);

  return { ref: targetRef, width };
}
