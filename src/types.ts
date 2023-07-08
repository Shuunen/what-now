export interface AirtableTask {
  createdTime: string
  fields: {
    'average-time': number // eslint-disable-line @typescript-eslint/naming-convention
    'completed-on': string // eslint-disable-line @typescript-eslint/naming-convention
    done: boolean // eslint-disable-line @typescript-eslint/naming-convention
    name: string
    once: string
  }
  id: string
}

export interface AirtableResponse {
  error?: {
    message: string
    type: string
  }
  records?: AirtableTask[]
}
