import { Button } from './ui/button'

export type CoachLanguage = 'en' | 'fr'

type CoachLanguagePickerProps = {
  language: CoachLanguage
  onChange: (value: CoachLanguage) => void
}

export function CoachLanguagePicker({ language, onChange }: CoachLanguagePickerProps) {
  return (
    <div className="flex gap-2" data-testid="coach-browser-language-picker">
      <Button data-testid="coach-browser-language-en" name="English" onClick={() => onChange('en')} variant={language === 'en' ? 'default' : 'outline'}>
        English
      </Button>
      <Button data-testid="coach-browser-language-fr" name="Français" onClick={() => onChange('fr')} variant={language === 'fr' ? 'default' : 'outline'}>
        Français
      </Button>
    </div>
  )
}
