interface KortLogoProps {
  size?: number;
  style?: React.CSSProperties;
}

export function KortLogo({ size = 32, style }: KortLogoProps) {
  return (
    <img
      src="/logo1.ico"
      alt="Kort"
      width={size}
      height={size}
      style={{
        borderRadius: 8,
        display: 'block',
        objectFit: 'cover',
        ...style,
      }}
    />
  );
}
