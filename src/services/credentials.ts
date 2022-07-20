import { emit, on, storage } from 'shuutils'

interface Credentials {
  base: string;
  key: string;
}

const DEMO_BASE = 'appQaesCng5o5xqE2'

class CredentialService {
  base!: string
  key!: string

  init (): void {
    this.checkHash().catch(error => console.error(error))
    on('save-credentials', async (credentials: Credentials) => this.save(credentials))
  }

  async checkStorage (): Promise<boolean | undefined> {
    const base: string = (await storage.get('api-base')) ?? ''
    const key: string = (await storage.get('api-key')) ?? ''
    const ok = this.validate(base, key)
    if (!ok) return emit('need-credentials')
    this.use({ base, key })
  }

  async checkHash (): Promise<boolean | undefined> {
    const { hash } = document.location
    const matches = /#(app\w{14})&(key\w{14})/.exec(hash) ?? []
    if (matches.length !== 3) return this.checkStorage()
    document.location.hash = ''
    return this.save({ base: matches[1], key: matches[2] })
  }

  async save (credentials: Credentials): Promise<boolean | undefined> {
    const ok = this.validate(credentials.base, credentials.key)
    if (!ok) return emit('need-credentials')
    if (credentials.base !== DEMO_BASE) {
      await storage.set('api-base', credentials.base)
      await storage.set('api-key', credentials.key)
    }
    this.use(credentials)
  }

  validate (base: string, key: string): boolean {
    const baseOk = base !== undefined && typeof base === 'string' && base.length === 17
    const keyOk = key !== undefined && typeof key === 'string' && key.length === 17
    return baseOk && keyOk
  }

  use (credentials: Credentials): void {
    this.base = credentials.base
    this.key = credentials.key
    emit('use-credentials', credentials)
  }

  async airtableUrl (target = ''): Promise<string | boolean> {
    const ok = this.validate(this.base, this.key)
    if (!ok) return emit('need-credentials')
    return `https://api.airtable.com/v0/${this.base}/${target}?api_key=${this.key}&view=todo`
  }
}

export const credentialService = new CredentialService()
