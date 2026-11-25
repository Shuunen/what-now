import { useCallback, useState } from 'react'
import { useBounce } from '../hooks/use-bounce'
import { progressAccentColor, progressAccentHue } from '../utils/progress.utils'
import { hueOffsets, shiftHue } from '../utils/screensaver.utils'
import { ScreensaverBubbles } from './screensaver-bubbles'

/** from this many remaining tasks, the faint number behind has two digits and must be smaller to fit the screen */
const twoDigits = 10

/**
 * The screensaver shown while tasks remain : a huge faint number behind, colored bubbles, and the What now logo with the remaining count bouncing around like a DVD logo.
 * @param props - the component props
 * @param props.percent - the progress percent, from 0 (red) to 100 (green)
 * @param props.remaining - how many tasks are still to do
 * @returns the countdown screensaver
 */
export function ScreensaverCountdown({ percent, remaining }: { percent: number; remaining: number }) {
  const accent = progressAccentColor(percent)
  const [hitCount, setHitCount] = useState(0)
  const handleHit = useCallback(() => setHitCount(count => count + 1), [])
  const { containerRef, itemRef } = useBounce(handleHit)
  const color = shiftHue(progressAccentHue(percent), hueOffsets[hitCount % hueOffsets.length] ?? 0)
  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="screensaver-countdown" ref={containerRef}>
      <ScreensaverBubbles isCalm={false} isDim={false} percent={percent} />
      <div aria-hidden="true" className={`absolute inset-0 flex items-center justify-center ${remaining >= twoDigits ? 'text-[38vmax]' : 'text-[54vmax]'} leading-none font-black tabular-nums opacity-10`} style={{ color: accent }}>
        {remaining}
      </div>
      <div className="absolute top-0 left-0 flex items-center gap-[2.5vmax] will-change-transform" ref={itemRef}>
        <div className="text-[9.5vmax] leading-[0.86] font-black tracking-tighter transition-colors duration-500" style={{ color }}>
          <span className="block">What</span>
          <span className="block text-white">now</span>
        </div>
        <div className="rounded-[3vmax] px-[2.6vmax] py-[1.2vmax] text-center text-black transition-colors duration-500" data-testid="screensaver-badge" style={{ background: color }}>
          <div className="text-[8.5vmax] leading-none font-black tabular-nums" data-testid="screensaver-count">
            {remaining}
          </div>
          <div className="text-[1.8vmax] font-medium tracking-wider uppercase">to do</div>
        </div>
      </div>
    </div>
  )
}
