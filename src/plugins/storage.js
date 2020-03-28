const storage = localStorage

export async function get (key) {
  const data = storage[key]
  if (!data) return Promise.reject(new Error(`storage : found no matching key "${key}"`))
  try {
    return Promise.resolve((data[0] === '{') ? JSON.parse(data) : data)
  } catch (e) {
    return Promise.reject(e)
  }
}

export async function set (key, data) {
  storage[key] = typeof data === 'object' ? JSON.stringify(data) : data
  return Promise.resolve(data)
}

export async function has (key) {
  return this.get(key).then(value => !!value).catch(() => false)
}
