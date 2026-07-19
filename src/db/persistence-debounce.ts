/** debounce for the IndexedDB write in use-persistence.ts; in its own zero-dependency file so e2e tests (run in Node) can import the value without pulling in Dexie's browser-only IndexedDB side-effects. */
export const debounceMs = 300
