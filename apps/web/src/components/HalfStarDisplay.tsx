import { getRatingLabel } from '@vinyl/shared/lib/utils';

type HalfStarDisplayProps = {
  rating: number;
  size?: number;
  showLabel?: boolean;
};

export function HalfStarDisplay({ rating, size = 16, showLabel = false }: HalfStarDisplayProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.min(Math.max(rating - i, 0), 1);
        return <MiniStarSvg key={i} size={size} fill={fill} />;
      })}
      {showLabel && (
        <span style={{ fontSize: size * 0.9, color: '#a0a0a0', marginLeft: 4 }}>
          {getRatingLabel(rating)}
        </span>
      )}
    </span>
  );
}

function MiniStarSvg({ size, fill }: { size: number; fill: number }) {
  const uid = `ms-${size}-${Math.round(fill * 10)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={uid}>
          <rect x="0" y="0" width={24 * fill} height="24" />
        </clipPath>
      </defs>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="#2a2a2a"
      />
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="#534AB7"
        clipPath={`url(#${uid})`}
      />
    </svg>
  );
}
