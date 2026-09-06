import { languageConfigs } from './coach-language.utils'

describe('coach-language.utils languageConfigs', () => {
  it('A uses the right BCP-47 speech codes', () => {
    expect(languageConfigs.en.speechLang).toBe('en-US')
    expect(languageConfigs.fr.speechLang).toBe('fr-FR')
  })

  it('B tells the coach never to ask for specific words, so no keyword is ever needed', () => {
    expect(languageConfigs.en.systemPrompt).toContain('Never ask him to answer with specific words or commands')
    expect(languageConfigs.fr.systemPrompt).toContain('Ne lui demande jamais de répondre avec des mots précis')
  })

  it('C frames it as one continuous conversation, not a task-by-task script', () => {
    expect(languageConfigs.en.systemPrompt).toContain('one continuous spoken conversation')
    expect(languageConfigs.fr.systemPrompt).toContain('une seule conversation parlée et continue')
  })

  it('D asks for suggestions and an order rather than a bare announcement', () => {
    expect(languageConfigs.en.systemPrompt).toContain('suggesting where to start and in what order')
    expect(languageConfigs.fr.systemPrompt).toContain('par quoi commencer et dans quel ordre')
  })

  it('E keeps the task numbers out of the spoken reply', () => {
    expect(languageConfigs.en.systemPrompt).toContain('Never say a number out loud')
    expect(languageConfigs.fr.systemPrompt).toContain('Ne dis jamais un numéro à voix haute')
  })

  it('F keeps replies short and free of symbols, since they are read aloud', () => {
    expect(languageConfigs.en.systemPrompt).toContain('2 short sentences')
    expect(languageConfigs.fr.systemPrompt).toContain('2 phrases courtes maximum')
  })

  it('G asks the French coach to answer in French, in the masculine', () => {
    expect(languageConfigs.fr.systemPrompt).toContain('toujours répondre en français')
    expect(languageConfigs.fr.systemPrompt).toContain('accorde TOUT au masculin')
  })
})
