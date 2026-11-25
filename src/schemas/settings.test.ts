import { defaultSettings, SettingsSchema } from './settings'

describe('SettingsSchema', () => {
  it('C keeps the screensaver delay', () => {
    const settings = SettingsSchema.parse({ screensaverIdleSeconds: 90 })
    expect(settings.screensaverIdleSeconds).toBe(90)
  })

  it('D rejects a screensaver delay out of range', () => {
    expect(SettingsSchema.safeParse({ screensaverIdleSeconds: 1 }).success).toBe(false)
    expect(SettingsSchema.safeParse({ screensaverIdleSeconds: 99_999 }).success).toBe(false)
    expect(SettingsSchema.safeParse({ screensaverIdleSeconds: 12.5 }).success).toBe(false)
  })

  it('A provides empty defaults', () => {
    expect(defaultSettings).toStrictEqual({ finaleDismissedOn: '', screensaverIdleSeconds: 60, syncUrl: '', userName: 'Me', webhook: '' })
  })

  it('B keeps provided values', () => {
    const settings = SettingsSchema.parse({ finaleDismissedOn: '2025-01-01', userName: 'Alice', webhook: 'https://example.com' })
    expect(settings.webhook).toBe('https://example.com')
    expect(settings.finaleDismissedOn).toBe('2025-01-01')
    expect(settings.userName).toBe('Alice')
  })
})
