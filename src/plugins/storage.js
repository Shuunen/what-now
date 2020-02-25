
export async function get (key) {
  const data = localStorage[key]
  if (!data) return Promise.reject(new Error(`storage : found no matching key "${key}"`))
  try {
    return Promise.resolve((data[0] === '{') ? JSON.parse(data) : data)
  } catch (e) {
    return Promise.reject(e)
  }
}

export async function set (key, data) {
  localStorage[key] = typeof data === 'object' ? JSON.stringify(data) : data
  return Promise.resolve(data)
}

export async function has (key) {
  return this.get(key).then(value => !!value).catch(() => false)
}
