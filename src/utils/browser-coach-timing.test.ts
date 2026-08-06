import { BrowserTimingLog } from './browser-coach-timing.utils'

describe('BrowserTimingLog', () => {
  it('A : record increments turn on listening_start', () => {
    const log = new BrowserTimingLog(performance.now())
    log.record('listening_start')
    log.record('listening_start')
    expect(log.events[0]?.turn).toBe(1)
    expect(log.events[1]?.turn).toBe(2)
  })

  it('B : recordFirstTokenOnce only records the first call per turn', () => {
    const log = new BrowserTimingLog(performance.now())
    log.record('listening_start')
    log.recordFirstTokenOnce()
    log.recordFirstTokenOnce()
    log.recordFirstTokenOnce()
    const firstTokenEvents = log.events.filter(event => event.label === 'agent_first_token')
    expect(firstTokenEvents).toHaveLength(1)
  })

  it('C : recordFirstTokenOnce resets per new turn', () => {
    const log = new BrowserTimingLog(performance.now())
    log.record('listening_start')
    log.recordFirstTokenOnce()
    log.record('listening_start')
    log.recordFirstTokenOnce()
    const firstTokenEvents = log.events.filter(event => event.label === 'agent_first_token')
    expect(firstTokenEvents).toHaveLength(2)
  })

  it('D : summaryLines reports no events recorded when empty', () => {
    const log = new BrowserTimingLog(performance.now())
    expect(log.summaryLines()).toStrictEqual(['[timing] no events recorded'])
  })

  it('E : summaryLines includes the timeline and longest steps sections', () => {
    const log = new BrowserTimingLog(performance.now())
    log.record('model_ready')
    log.record('listening_start')
    log.record('listening_stop')
    log.record('stt_stop')
    log.record('agent_query_start')
    log.recordFirstTokenOnce()
    log.record('agent_query_stop')
    log.record('tts_start')
    log.record('playing_start')
    log.record('tts_stop')
    log.record('playing_stop')
    const lines = log.summaryLines()
    expect(lines.join('\n')).toContain('TIMELINE')
    expect(lines.join('\n')).toContain('STEP DURATIONS')
    expect(lines.join('\n')).toContain('LONGEST STEPS ACROSS THE WHOLE SESSION')
    expect(lines.join('\n')).toContain('Turn 1:')
  })
})
