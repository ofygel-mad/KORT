interface SkeletonProps {
  width?:  string | number;
  height?: string | number;
  radius?: string | number;
  style?: React.CSSProperties;
}

export function Skeleton({ width='100%', height=16, radius='var(--radius-sm)', style }: SkeletonProps) {
  return (
    <div style={{
      width, height,
      borderRadius:radius,
      background:'linear-gradient(90deg, var(--color-bg-muted) 25%, var(--color-border) 50%, var(--color-bg-muted) 75%)',
      backgroundSize:'200% 100%',
      animation:'shimmer 1.4s ease-in-out infinite',
      ...style,
    }} />
  );
}
