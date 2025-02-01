import { isBrowserEnvironment } from 'shuutils'
import { expect, it } from 'vitest'

it('should detect browser env', () => {
  expect(isBrowserEnvironment()).toMatchInlineSnapshot(`false`)
})
