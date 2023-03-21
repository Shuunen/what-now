export interface AirtableTask {
  id: string
  createdTime: string
  fields: {
    name: string
    once: string
    done: boolean // eslint-disable-line @typescript-eslint/naming-convention
    'completed-on': string // eslint-disable-line @typescript-eslint/naming-convention
    'average-time': number // eslint-disable-line @typescript-eslint/naming-convention
  }
}

export interface AirtableResponse {
  records?: AirtableTask[]
  error?: {
    type: string
    message: string
  }
}
