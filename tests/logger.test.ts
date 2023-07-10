import { expect, it } from 'vitest'
import { stuffToMessage } from '../src/utils/logger.utils'

it('stuffToMessage A', function () {
  const result = stuffToMessage('a', 'b', 'c')
  expect(result).toBe('a, b, c')
})

it('stuffToMessage B', function () {
  const result = stuffToMessage('a', 'b', { cat: 'd' })
  expect(result).toMatchInlineSnapshot('"a, b, {\\"cat\\":\\"d\\"}"')
})

it('stuffToMessage C', function () {
  const result = stuffToMessage('a', 'b', { cat: 'dog' }, 1, 2, 3)
  expect(result).toMatchInlineSnapshot('"a, b, {\\"cat\\":\\"dog\\"}, 1, 2, 3"')
})
