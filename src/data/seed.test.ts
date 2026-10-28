import { describe, expect, it } from 'vitest'
import { initialData, seedCars, seedTracks } from './seed'

describe('initial local data', () => {
  it('uses stable unique identifiers', () => {
    expect(new Set(seedTracks.map((track) => track.id)).size).toBe(seedTracks.length)
    expect(new Set(seedCars.map((car) => car.id)).size).toBe(seedCars.length)
  })

  it('keeps king tracks within the configured limit', () => {
    expect(seedTracks.filter((track) => track.king).length).toBeLessThanOrEqual(15)
  })

  it('starts with a valid two-side match', () => {
    expect(initialData.match.competitors).toHaveLength(2)
    expect(initialData.match.rounds).toEqual([])
  })
})
