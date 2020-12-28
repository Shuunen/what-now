
export interface AirtableTaskRecord {
  id: string;
  createdTime: string;
  fields: {
    name: string;
    once: string;
    'completed-on': string;
    order: number;
    'average-time': number;
  };
}

export interface AirtableResponse {
  records: AirtableTaskRecord[];
  error?: {
    type: string;
    message: string;
  };
}
