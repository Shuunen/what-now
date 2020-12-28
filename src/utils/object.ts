export const checkProp = (key: string, object: any) => {
  if (object[key] === '') throw new Error(`${key} is mandatory and empty`)
  if (object[key] === undefined) throw new Error(`${key} is mandatory and not defined`)
}
