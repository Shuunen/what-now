import { defaultSettings, SettingsSchema } from './settings'

describe('SettingsSchema', () => {
  it('C keeps the screensaver delay', () => {
    const settings = SettingsSchema.parse({ screensaverIdleSeconds: 90 })
    expect(settings.screensaverIdleSeconds).toBe(90)
  })

  it('E keeps a valid night and rejects a badly written time', () => {
    const settings = SettingsSchema.parse({ nightEnd: '06:30', nightStart: '23:30' })
    expect(settings.nightStart).toBe('23:30')
    expect(settings.nightEnd).toBe('06:30')
    expect(SettingsSchema.safeParse({ nightStart: '24:00' }).success).toBe(false)
    expect(SettingsSchema.safeParse({ nightEnd: '7:00' }).success).toBe(false)
  })

  it('D rejects a screensaver delay out of range', () => {
    expect(SettingsSchema.safeParse({ screensaverIdleSeconds: 1 }).success).toBe(false)
    expect(SettingsSchema.safeParse({ screensaverIdleSeconds: 99_999 }).success).toBe(false)
    expect(SettingsSchema.safeParse({ screensaverIdleSeconds: 12.5 }).success).toBe(false)
  })

  it('A provides empty defaults', () => {
    expect(defaultSettings).toStrictEqual({ finaleDismissedOn: '', nightEnd: '07:00', nightStart: '00:00', screensaverIdleSeconds: 60, syncUrl: '', userName: 'Me', webhook: '' })
  })

  it('B keeps provided values', () => {
    const settings = SettingsSchema.parse({ finaleDismissedOn: '2025-01-01', userName: 'Alice', webhook: 'https://example.com' })
    expect(settings.webhook).toBe('https://example.com')
    expect(settings.finaleDismissedOn).toBe('2025-01-01')
    expect(settings.userName).toBe('Alice')
  })
})
