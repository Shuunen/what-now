type Second = number

export interface AirtableTaskRecord {
  id: string
  createdTime: string
  fields: {
    name: string
    once: string
    done: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'completed-on': string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'average-time': Second
  }
}

export interface AirtableResponse {
  records?: AirtableTaskRecord[]
  error?: {
    type: string
    message: string
  }
}
