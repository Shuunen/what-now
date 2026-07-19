import { defaultAppData } from '../schemas/app-data'
import { exportFilename, exportJson } from './import-export.utils'

describe('exportFilename', () => {
  it('A stamps the given date', () => {
    expect(exportFilename(new Date('2025-01-26T18:53:32.006Z'))).toBe('2025-01-26_what-now.json')
  })

  it('B defaults to a dated filename', () => {
    expect(exportFilename()).toMatch(/^\d{4}-\d{2}-\d{2}_what-now\.json$/u)
  })
})

describe('exportJson', () => {
  it('A produces pretty-printed JSON that round-trips', () => {
    const json = exportJson(defaultAppData)
    expect(json).toContain('\n')
    expect(JSON.parse(json)).toStrictEqual(defaultAppData)
  })
})
