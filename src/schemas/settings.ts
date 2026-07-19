import { z } from 'zod/v4'

export const SettingsSchema = z.object({
  /** iso10 date the finale celebration screen was last dismissed on, to avoid showing it again the same day */
  finaleDismissedOn: z.string().default(''),
  /** the user's name, used as the attribution when displaying their tasks */
  userName: z.string().default('Me'),
  /** the webhook URL to notify external services with the current progress */
  webhook: z.string().default(''),
})

export type Settings = z.infer<typeof SettingsSchema>

export const defaultSettings: Settings = SettingsSchema.parse({})
