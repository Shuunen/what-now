import { countRemaining, isNightTime, formatClockDate, formatClockTime, paleColor, shiftHue } from './screensaver.utils'
import { taskMock } from './tasks.utils'

const at = (hours: number, minutes: number) => new Date(2026, 10, 25, hours, minutes)

describe('screensaver.utils', () => {
  it('A shiftHue moves the hue of the accent color', () => {
    expect(shiftHue(22, 10)).toBe('oklch(72% 0.18 32)')
    expect(shiftHue(150, -20)).toBe('oklch(72% 0.18 130)')
  })

  it('B paleColor lightens and desaturates the accent color', () => {
    expect(paleColor(150, 0)).toBe('oklch(82% 0.063 150)')
  })

  it('C countRemaining only counts the tasks still to do', () => {
    const tasks = [taskMock({ completedOn: '', id: 'a' }), taskMock({ id: 'b', once: 'week' }), taskMock({ completedOn: '', id: 'c', isDone: true })]
    expect(countRemaining(tasks)).toBe(1)
    expect(countRemaining([])).toBe(0)
  })

  it('D formatClockTime shows the time in 24h', () => {
    expect(formatClockTime(new Date(2026, 10, 25, 9, 5), 'fr-FR')).toBe('09:05')
    expect(formatClockTime(new Date(2026, 10, 25, 21, 30), 'en-US')).toBe('21:30')
  })

  it('E formatClockDate shows the day in full', () => {
    expect(formatClockDate(new Date(2026, 10, 25, 9, 5), 'fr-FR')).toBe('mercredi 25 novembre')
    expect(formatClockDate(new Date(2026, 10, 25, 9, 5), 'en-US')).toBe('Wednesday, November 25')
  })

  it('G isNightTime covers the night between the start and the end', () => {
    expect(isNightTime(at(0, 0), '00:00', '07:00')).toBe(true)
    expect(isNightTime(at(6, 59), '00:00', '07:00')).toBe(true)
    expect(isNightTime(at(7, 0), '00:00', '07:00')).toBe(false)
    expect(isNightTime(at(12, 0), '00:00', '07:00')).toBe(false)
    expect(isNightTime(at(23, 59), '00:00', '07:00')).toBe(false)
  })

  it('H isNightTime handles a night that crosses midnight', () => {
    expect(isNightTime(at(23, 30), '23:30', '06:30')).toBe(true)
    expect(isNightTime(at(2, 0), '23:30', '06:30')).toBe(true)
    expect(isNightTime(at(6, 30), '23:30', '06:30')).toBe(false)
    expect(isNightTime(at(12, 0), '23:30', '06:30')).toBe(false)
  })

  it('I isNightTime is off when the start and the end are the same time', () => {
    expect(isNightTime(new Date(2026, 10, 25, 3, 0), '07:00', '07:00')).toBe(false)
  })
})
