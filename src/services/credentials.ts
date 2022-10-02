import { emit, on, storage } from 'shuutils'

interface Credentials {
  base: string
  key: string
}

const DEMO_BASE = 'appQaesCng5o5xqE2'

class CredentialService {
  base!: string
  key!: string

  init (): void {
    this.checkHash().catch(error => console.error(error))
    on('save-credentials', async (credentials: Credentials) => this.save(credentials))
  }

  async checkStorage (): Promise<boolean> {
    console.log('check storage')
    const base = storage.get('api-base', '')
    const key = storage.get('api-key', '')
    const ok = this.validate(base, key)
    if (!ok) return emit('need-credentials')
    this.use({ base, key })
    return true
  }

  async checkHash (): Promise<boolean> {
    const { hash } = document.location
    const matches = /#(app\w{14})&(key\w{14})/.exec(hash)
    if (!matches || matches.length !== 3 || !matches[1] || !matches[2]) return this.checkStorage()
    document.location.hash = ''
    await this.save({ base: matches[1], key: matches[2] })
    return true
  }

  async save (credentials: Credentials): Promise<boolean> {
    console.log('save credentials', credentials)
    const ok = this.validate(credentials.base, credentials.key)
    if (!ok) return emit('need-credentials')
    if (credentials.base !== DEMO_BASE) {
      storage.set('api-base', credentials.base)
      storage.set('api-key', credentials.key)
    }
    this.use(credentials)
    return true
  }

  validate (base: string, key: string): boolean {
    const baseOk = base !== undefined && typeof base === 'string' && base.length === 17
    const keyOk = key !== undefined && typeof key === 'string' && key.length === 17
    const valid = baseOk && keyOk
    console.log('credentials valid ?', valid)
    return valid
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
