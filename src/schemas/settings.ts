import { z } from 'zod/v4'

export const SettingsSchema = z.object({
  /** iso10 date the finale celebration screen was last dismissed on, to avoid showing it again the same day */
  finaleDismissedOn: z.string().default(''),
  /** the user's own Convex deployment URL for optional cross-device sync, empty string when sync is off. The settings UI health-checks the deployment before saving a non-empty value here, but that's not a hard guarantee: imported app data can set it without a check, and a previously-valid deployment can later become unreachable. Local to this device only — never synced itself. */
  syncUrl: z.string().default(''),
  /** the user's name, used as the attribution when displaying their tasks */
  userName: z.string().default('Me'),
  /** the webhook URL to notify external services with the current progress */
  webhook: z.string().default(''),
})

export type Settings = z.infer<typeof SettingsSchema>

export const defaultSettings: Settings = SettingsSchema.parse({})
