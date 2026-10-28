import { describe, expect, it } from 'vitest'
import { initialData, seedCars, seedTracks } from './seed'

describe('initial local data', () => {
  it('uses stable unique identifiers', () => {
    expect(new Set(seedTracks.map((track) => track.id)).size).toBe(seedTracks.length)
    expect(new Set(seedCars.map((car) => car.id)).size).toBe(seedCars.length)
  })

  it('starts without king tracks or personal records', () => {
    expect(seedTracks.filter((track) => track.king)).toHaveLength(0)
    expect(seedTracks.filter((track) => track.record)).toHaveLength(0)
  })

  it('starts with a valid two-side match', () => {
    expect(initialData.match.competitors).toHaveLength(2)
    expect(initialData.match.rounds).toEqual([])
    expect(initialData.match.configured).toBe(false)
  })
})
