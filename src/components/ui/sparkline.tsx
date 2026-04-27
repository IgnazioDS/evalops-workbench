"use client";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Stroke colour. Accepts any CSS colour. Defaults to current text colour. */
  color?: string;
  filled?: boolean;
  /** Show the latest value as a dot terminator. */
  dot?: boolean;
  className?: string;
}

/**
 * Tiny smoothed line chart for inline trend display in StatCards.
 * Renders nothing if `data` is empty or has fewer than 2 points.
 */
export function Sparkline({
  data,
  width = 80,
  height = 28,
  color = "currentColor",
  filled = true,
  dot = true,
  className,
}: SparklineProps) {
  if (!data.length || data.length < 2) return null;

  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  // Smooth bezier path between points.
  const linePath = points
    .map(([x, y], i) => {
      if (i === 0) return `M ${x},${y}`;
      const [px, py] = points[i - 1];
      const cpx = (px + x) / 2;
      return `C ${cpx},${py} ${cpx},${y} ${x},${y}`;
    })
    .join(" ");

  const fillPath =
    `${linePath} L ${points[points.length - 1][0]},${height} ` +
    `L ${points[0][0]},${height} Z`;

  const last = points[points.length - 1];
  const gradientId = `spark-${data.length}-${Math.round(min)}-${Math.round(max)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      role="img"
      aria-label="trend"
      className={className}
    >
      {filled && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={fillPath} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        d={linePath}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dot && (
        <circle cx={last[0]} cy={last[1]} r={2} fill={color} />
      )}
    </svg>
  );
}
