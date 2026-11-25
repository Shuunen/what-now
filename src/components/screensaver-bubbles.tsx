import { hueShiftBig, hueShiftSmall, paleColor, shiftHue } from '../utils/screensaver.utils'

/** a calm bubble drifts this many times slower than a lively one */
const calmSlowdown = 6
const calmOpacity = 0.16
const livelyOpacity = 0.5

const bubbles = [
  { animation: 'wn-drift-a', left: '-4%', offset: hueShiftBig, seconds: 38, size: '52vmax', top: '-18%' },
  { animation: 'wn-drift-b', left: '52%', offset: -hueShiftSmall, seconds: 46, size: '48vmax', top: '-12%' },
  { animation: 'wn-drift-c', left: '8%', offset: 0, seconds: 52, size: '50vmax', top: '32%' },
  { animation: 'wn-drift-d', left: '48%', offset: -hueShiftBig, seconds: 44, size: '44vmax', top: '36%' },
] as const

/**
 * Soft colored bubbles drifting behind the screensaver, in shades of the progress color.
 * @param props - the component props
 * @param props.accent - the css color of the current progress, from red to green
 * @param props.isCalm - very slow, very pale bubbles, for the clock
 * @returns the bubbles layer
 */
export function ScreensaverBubbles({ accent, isCalm }: { accent: string; isCalm: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" data-testid="screensaver-bubbles">
      {bubbles.map(bubble => {
        const color = isCalm ? paleColor(accent, bubble.offset) : shiftHue(accent, bubble.offset)
        return (
          <div
            className="wn-bubble absolute rounded-full transition-[background] duration-[2000ms] will-change-transform"
            key={bubble.animation}
            style={{
              animation: `${bubble.animation} ${bubble.seconds * (isCalm ? calmSlowdown : 1)}s ease-in-out infinite alternate`,
              background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
              height: bubble.size,
              left: bubble.left,
              opacity: isCalm ? calmOpacity : livelyOpacity,
              top: bubble.top,
              width: bubble.size,
            }}
          />
        )
      })}
    </div>
  )
}
