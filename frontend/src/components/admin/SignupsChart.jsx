import React, { useState } from 'react';

export default function SignupsChart({ data = [] }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-text-muted">
        No signup data available for the selected period.
      </div>
    );
  }

  const height = 160;
  const width = 500;
  const paddingX = 35;
  const paddingY = 25;

  const counts = data.map((d) => d.count);
  const maxCount = Math.max(...counts, 4);

  // Compute points
  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - (d.count / maxCount) * (height - 2 * paddingY);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  // Grid lines
  const gridLines = [0, Math.ceil(maxCount / 2), maxCount];

  return (
    <div className="w-full relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
      >
        <defs>
          <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-500, #3b82f6)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-brand-500, #3b82f6)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((val, idx) => {
          const y = height - paddingY - (val / maxCount) * (height - 2 * paddingY);
          return (
            <g key={idx}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="3 3"
              />
              <text
                x={paddingX - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-text-muted text-[9px] font-mono"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Area */}
        <path d={areaD} fill="url(#signupGradient)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-brand-500, #3b82f6)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((pt, index) => {
          const isHovered = hoveredIndex === index;
          return (
            <g
              key={index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer transition-all"
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 5.5 : 3}
                fill="var(--color-surface, #ffffff)"
                stroke="var(--color-brand-500, #3b82f6)"
                strokeWidth={isHovered ? 2.5 : 2}
                className="transition-all"
              />
              {/* Invisible larger hover target */}
              <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />
            </g>
          );
        })}

        {/* X-axis labels (first, middle, last) */}
        {points.length > 0 && (
          <>
            <text
              x={points[0].x}
              y={height - 6}
              textAnchor="start"
              className="fill-text-muted text-[9px] font-mono"
            >
              {points[0].date.slice(5)}
            </text>
            <text
              x={points[Math.floor(points.length / 2)].x}
              y={height - 6}
              textAnchor="middle"
              className="fill-text-muted text-[9px] font-mono"
            >
              {points[Math.floor(points.length / 2)].date.slice(5)}
            </text>
            <text
              x={points[points.length - 1].x}
              y={height - 6}
              textAnchor="end"
              className="fill-text-muted text-[9px] font-mono"
            >
              {points[points.length - 1].date.slice(5)}
            </text>
          </>
        )}
      </svg>

      {/* Hover tooltip */}
      {hoveredIndex !== null && points[hoveredIndex] && (
        <div
          className="absolute -top-7 pointer-events-none transform -translate-x-1/2 px-2.5 py-1 rounded-lg bg-surface-raised text-text text-[11px] font-bold shadow-md border border-border whitespace-nowrap z-10"
          style={{
            left: `${(points[hoveredIndex].x / width) * 100}%`,
          }}
        >
          {points[hoveredIndex].date}: {points[hoveredIndex].count} signup
          {points[hoveredIndex].count !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
