export function CheckmarkIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`animate-[wn-draw_0.4s_cubic-bezier(0.65,0,0.35,1)_0.08s_forwards] ${className ?? ''}`}
      fill="none"
      height="14"
      stroke="currentColor"
      strokeDasharray={100}
      strokeDashoffset={100}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      viewBox="0 0 24 24"
      width="14"
    >
      <polyline pathLength={100} points="5 12.5 10 17.5 19 7" />
    </svg>
  )
}
