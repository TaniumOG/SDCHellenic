import { DailyPoint } from '@/lib/simulator';

type Props = {
  points: DailyPoint[];
  color: string;
  metric: 'cumulativeRevenue' | 'cumulativeTickets' | 'remainingCapacity';
  height?: number;
};

export function LineChart({ points, color, metric, height = 180 }: Props) {
  const width = 640;
  if (points.length === 0) return null;

  const values = points.map((p) => p[metric]);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const path = points
    .map((point, idx) => {
      const x = (idx / Math.max(points.length - 1, 1)) * width;
      const normalized = (point[metric] - min) / range;
      const y = height - normalized * height;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${metric} chart`}>
      <path d={path} fill="none" stroke={color} strokeWidth="3" />
    </svg>
  );
}
