import { defaultSettings, SettingsSchema } from './settings'

describe('SettingsSchema', () => {
  it('A provides empty defaults', () => {
    expect(defaultSettings).toStrictEqual({ finaleDismissedOn: '', syncUrl: '', userName: 'Me', webhook: '' })
  })

  it('B keeps provided values', () => {
    const settings = SettingsSchema.parse({ finaleDismissedOn: '2025-01-01', userName: 'Alice', webhook: 'https://example.com' })
    expect(settings.webhook).toBe('https://example.com')
    expect(settings.finaleDismissedOn).toBe('2025-01-01')
    expect(settings.userName).toBe('Alice')
  })
})
