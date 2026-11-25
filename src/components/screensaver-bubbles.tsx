import { progressAccentHue } from '../utils/progress.utils'
import { hueShiftBig, hueShiftSmall, paleColor, shiftHue } from '../utils/screensaver.utils'

/** a calm bubble drifts this many times slower than a lively one */
const calmSlowdown = 6
const calmOpacity = 0.16
/** at night the calm bubbles are twice as dim */
const nightOpacity = 0.08
const livelyOpacity = 0.5

function bubbleOpacity(isCalm: boolean, isDim: boolean) {
  if (!isCalm) return livelyOpacity
  return isDim ? nightOpacity : calmOpacity
}

const bubbles = [
  { animation: 'wn-drift-a', left: '-4%', offset: hueShiftBig, seconds: 38, size: '52vmax', top: '-18%' },
  { animation: 'wn-drift-b', left: '52%', offset: -hueShiftSmall, seconds: 46, size: '48vmax', top: '-12%' },
  { animation: 'wn-drift-c', left: '8%', offset: 0, seconds: 52, size: '50vmax', top: '32%' },
  { animation: 'wn-drift-d', left: '48%', offset: -hueShiftBig, seconds: 44, size: '44vmax', top: '36%' },
] as const

/**
 * Soft colored bubbles drifting behind the screensaver, in shades of the progress color.
 * @param props - the component props
 * @param props.percent - the progress percent, from 0 (red) to 100 (green)
 * @param props.isCalm - very slow, very pale bubbles, for the clock
 * @param props.isDim - even dimmer calm bubbles, for the night clock
 * @returns the bubbles layer
 */
export function ScreensaverBubbles({ isCalm, isDim, percent }: { isCalm: boolean; isDim: boolean; percent: number }) {
  const hue = progressAccentHue(percent)
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" data-testid="screensaver-bubbles">
      {bubbles.map(bubble => {
        const color = isCalm ? paleColor(hue, bubble.offset) : shiftHue(hue, bubble.offset)
        return (
          <div
            className="wn-bubble absolute rounded-full will-change-transform"
            key={bubble.animation}
            style={{
              animation: `${bubble.animation} ${bubble.seconds * (isCalm ? calmSlowdown : 1)}s ease-in-out infinite alternate`,
              background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
              height: bubble.size,
              left: bubble.left,
              opacity: bubbleOpacity(isCalm, isDim),
              top: bubble.top,
              width: bubble.size,
            }}
          />
        )
      })}
    </div>
  )
}
