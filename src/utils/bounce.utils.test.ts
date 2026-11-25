import { type BounceState, stepBounce } from './bounce.utils'

describe('bounce.utils', () => {
  const state: BounceState = { left: 10, speedX: 100, speedY: 50, top: 10 }

  it('A moves the item according to its velocity and the elapsed time', () => {
    const result = stepBounce(state, 500, { height: 1000, width: 1000 })
    expect(result.state).toStrictEqual({ left: 60, speedX: 100, speedY: 50, top: 35 })
    expect(result.hasHit).toBe(false)
  })

  it('B bounces on the right wall', () => {
    const result = stepBounce({ ...state, left: 95 }, 500, { height: 1000, width: 100 })
    expect(result.state).toMatchObject({ left: 100, speedX: -100 })
    expect(result.hasHit).toBe(true)
  })

  it('C bounces on the left wall', () => {
    const result = stepBounce({ ...state, left: 20, speedX: -100 }, 500, { height: 1000, width: 1000 })
    expect(result.state).toMatchObject({ left: 0, speedX: 100 })
    expect(result.hasHit).toBe(true)
  })

  it('D bounces on the bottom wall', () => {
    const result = stepBounce({ ...state, top: 95 }, 1000, { height: 100, width: 1000 })
    expect(result.state).toMatchObject({ speedY: -50, top: 100 })
    expect(result.hasHit).toBe(true)
  })

  it('E bounces on the top wall', () => {
    const result = stepBounce({ ...state, speedY: -50, top: 10 }, 1000, { height: 1000, width: 1000 })
    expect(result.state).toMatchObject({ speedY: 50, top: 0 })
    expect(result.hasHit).toBe(true)
  })

  it('F stays put and never reports a hit when the item is bigger than its container', () => {
    const result = stepBounce(state, 500, { height: 0, width: -20 })
    expect(result.state).toStrictEqual({ left: 0, speedX: 100, speedY: 50, top: 0 })
    expect(result.hasHit).toBe(false)
  })
})
