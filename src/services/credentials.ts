import { emit, on, sleep, storage } from 'shuutils'
import { numbers } from '../utils'

interface Credentials {
  base: string
  key: string
}

const demoBase = 'appQaesCng5o5xqE2'
const baseKeyLength = 17

class CredentialService {

  private base = ''

  private key = ''

  public init (): void {
    void this.checkHash()
    on('save-credentials', this.save.bind(this))
  }

  private validate (base?: string, key?: string): boolean {
    const isBaseOk = base !== undefined && typeof base === 'string' && base.length === baseKeyLength
    const isKeyOk = key !== undefined && typeof key === 'string' && key.length === baseKeyLength
    const isValid = isBaseOk && isKeyOk
    console.log('credentials valid ?', isValid)
    return isValid
  }

  public airtableUrl (target = ''): string {
    const isOk = this.validate(this.base, this.key)
    if (!isOk) return ''
    return `https://api.airtable.com/v0/${this.base}/${target}?api_key=${this.key}&view=todo`
  }

  private async checkStorage (): Promise<boolean> {
    console.log('check storage')
    const base = storage.get('api-base', '')
    const key = storage.get('api-key', '')
    const isOk = this.validate(base, key)
    if (!isOk) return emit('need-credentials')
    await this.use({ base, key })
    return true
  }

  private async checkHash (): Promise<boolean> {
    const { hash } = document.location
    const [, base, key] = /#(app\w{14})&(key\w{14})/u.exec(hash) ?? []
    if (base === undefined || key === undefined) return await this.checkStorage()
    document.location.hash = ''
    await this.save({ base, key })
    return true
  }

  private async save (credentials: Credentials): Promise<boolean> {
    console.log('save credentials', credentials)
    const isOk = this.validate(credentials.base, credentials.key)
    if (!isOk) return emit('need-credentials')
    if (credentials.base !== demoBase) {
      storage.set('api-base', credentials.base)
      storage.set('api-key', credentials.key)
    }
    await this.use(credentials)
    return true
  }

  private async use (credentials: Credentials): Promise<void> {
    this.base = credentials.base
    this.key = credentials.key
    await sleep(numbers.smallSleep) // let the on('use-credentials') listeners be ready
    emit('use-credentials', credentials)
  }
}

export const credentialService = new CredentialService()
