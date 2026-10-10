import React from 'react';

/**
 * Reusable SVG defs hatch pattern for pending chart elements.
 * Provides accessible diagonal striping so meaning is conveyed by texture
 * in addition to amber/warning coloration.
 */
export function ChartHatchPattern({ id = 'chart-hatch-pending', stroke = 'var(--chart-pending)' }) {
  return (
    <defs>
      <pattern
        id={id}
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="8"
          stroke={stroke}
          strokeWidth="2.5"
          strokeOpacity="0.85"
        />
      </pattern>
    </defs>
  );
}

export default ChartHatchPattern;
