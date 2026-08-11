import { CalendarIcon, CircleQuestionMarkIcon, HomeIcon, MicIcon, MicOffIcon, SettingsIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { CoachSetting } from '../components/coach-language-picker'
import type { FloatingMenuAction } from '../components/floating-menu'
import { useAppStore } from '../store/use-app-store'

/**
 * Returns a filtered list of navigation actions, excluding any whose name includes the given string.
 * Each action contains a `handleClick` function for navigation, an `icon` component, and a `name`.
 * @returns An array of action objects excluding those whose names include the `except` string.
 */
export function useActions() {
  const navigate = useNavigate()
  const currentPath = globalThis.location.pathname
  const coachEnabled = useAppStore(state => state.data.settings.coachEnabled)
  const setCoachEnabled = useAppStore(state => state.setCoachEnabled)
  function getAction(icon: FloatingMenuAction['icon'], name: FloatingMenuAction['name'], path: string) {
    return {
      disabled: path === currentPath,
      handleClick: () => navigate(path),
      icon,
      name,
    } satisfies FloatingMenuAction
  }
  const coachAction: FloatingMenuAction = {
    dimmed: !coachEnabled,
    handleClick: () => setCoachEnabled(!coachEnabled),
    icon: coachEnabled ? MicIcon : MicOffIcon,
    name: 'Coach',
  }
  return [getAction(HomeIcon, 'Tasks', '/'), getAction(CalendarIcon, 'Planner', '/planner'), coachAction, getAction(SettingsIcon, 'Settings', '/settings'), getAction(CircleQuestionMarkIcon, 'About', '/about')]
}

/**
 * Exposes the voice coach's on/off + language settings as a single three-way value ("disabled" | "en" | "fr")
 * for the settings page picker, translating changes back into the two underlying store setters.
 * @returns the current combined setting and a setter for it
 */
export function useCoachSetting() {
  const coachEnabled = useAppStore(state => state.data.settings.coachEnabled)
  const setCoachEnabled = useAppStore(state => state.setCoachEnabled)
  const coachLanguage = useAppStore(state => state.data.settings.coachLanguage)
  const setCoachLanguage = useAppStore(state => state.setCoachLanguage)
  const value: CoachSetting = coachEnabled ? coachLanguage : 'disabled'
  function setValue(next: CoachSetting) {
    if (next === 'disabled') {
      setCoachEnabled(false)
      return
    }
    setCoachEnabled(true)
    setCoachLanguage(next)
  }
  return { setValue, value }
}
