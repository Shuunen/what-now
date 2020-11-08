const storage = localStorage

export async function get (key) {
  const data = storage[key]
  if (!data) return
  return (data[0] === '{') ? JSON.parse(data) : data
}

export async function set (key, data) {
  storage[key] = typeof data === 'object' ? JSON.stringify(data) : data
  return data
}

export async function has (key) {
  return this.get(key).then(value => !!value).catch(() => false)
}
