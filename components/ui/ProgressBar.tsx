'use client'

interface Props {
  value: number // 0–100
  className?: string
}

export default function ProgressBar({ value, className = '' }: Props) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={`w-full bg-gray-100 rounded-full h-2.5 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, backgroundColor: 'var(--brand)' }}
      />
    </div>
  )
}
