interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = "100%", height = 16, style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: 6, ...style }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: 24,
    }}>
      <Skeleton width={80} height={12} style={{ marginBottom: 12 }} />
      <Skeleton width={140} height={32} style={{ marginBottom: 8 }} />
      <Skeleton width={100} height={12} />
    </div>
  );
}
