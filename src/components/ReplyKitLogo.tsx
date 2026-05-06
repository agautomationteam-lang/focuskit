interface ReplyKitLogoProps {
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { box: 24, radius: 6 },
  md: { box: 28, radius: 7 },
  lg: { box: 40, radius: 10 },
}

export default function ReplyKitLogo({ size = 'md' }: ReplyKitLogoProps) {
  const { box, radius } = SIZES[size]
  const icon = Math.round(box * 0.58)

  return (
    <div
      style={{
        width: box,
        height: box,
        minWidth: box,
        borderRadius: radius,
        background: 'linear-gradient(135deg, #4F46E5 0%, #00D9FF 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={icon} height={icon} viewBox="0 0 20 20" fill="none">
        <rect x="1" y="1" width="18" height="13" rx="3" fill="white" opacity="0.95" />
        <polygon points="2,14 2,18 6,14" fill="white" opacity="0.95" />
        <path
          d="M5 7.5L8.5 11L15 5.5"
          stroke="#4F46E5"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
