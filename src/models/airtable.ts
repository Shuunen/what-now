type Second = number

export interface AirtableTaskRecord {
  id: string;
  createdTime: string;
  fields: {
    name: string;
    once: string;
    done: string;
    'completed-on': string;
    'average-time': Second;
  };
}

export interface AirtableResponse {
  records?: AirtableTaskRecord[];
  error?: {
    type: string;
    message: string;
  };
}
