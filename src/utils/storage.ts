/* istanbul ignore next */
export async function get(key: string, storage = localStorage) {
  const data = storage[key]
  if (!data) return
  return (data[0] === '{') ? JSON.parse(data) : data
}

/* istanbul ignore next */
export async function set(key: string, data: string | Record<string, unknown>, storage = localStorage) {
  storage[key] = typeof data === 'object' ? JSON.stringify(data) : data
  return data
}

/* istanbul ignore next */
export async function has(key: string, storage = localStorage) {
  const value = await get(key, storage)
  return value !== undefined
}

/* istanbul ignore next */
export function clear(key: string, storage = localStorage) {
  /* eslint-disable-next-line @typescript-eslint/no-dynamic-delete */
  delete storage[key]
}
