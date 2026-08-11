import { Button } from './ui/button'

export type CoachLanguage = 'en' | 'fr'

export type CoachSetting = 'disabled' | CoachLanguage

type CoachLanguagePickerProps = {
  onChange: (value: CoachSetting) => void
  value: CoachSetting
}

export function CoachLanguagePicker({ onChange, value }: CoachLanguagePickerProps) {
  return (
    <div className="flex gap-2" data-testid="coach-language-picker">
      <Button data-testid="coach-language-disabled" name="Disabled" onClick={() => onChange('disabled')} variant={value === 'disabled' ? 'default' : 'outline'}>
        Disabled
      </Button>
      <Button data-testid="coach-language-en" name="English" onClick={() => onChange('en')} variant={value === 'en' ? 'default' : 'outline'}>
        English
      </Button>
      <Button data-testid="coach-language-fr" name="Français" onClick={() => onChange('fr')} variant={value === 'fr' ? 'default' : 'outline'}>
        Français
      </Button>
    </div>
  )
}
