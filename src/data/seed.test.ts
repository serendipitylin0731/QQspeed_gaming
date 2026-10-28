import { describe, expect, it } from 'vitest'
import { initialData } from './seed'

describe('initial local data', () => {
  it('starts without demo maps, cars, kings, or records', () => {
    expect(initialData.tracks).toEqual([])
    expect(initialData.cars).toEqual([])
  })

  it('starts with a valid two-side match', () => {
    expect(initialData.match.competitors).toHaveLength(2)
    expect(initialData.match.rounds).toEqual([])
    expect(initialData.match.configured).toBe(false)
  })
})
