import type { Track } from '../types'
import { emptyPools } from './pools'

export function correctTrack(track: Track): Track {
  const normalized = track.pools && typeof track.pools.item === 'boolean' ? track : { ...track, pools: { ...emptyPools, ...track.pools } }
  return normalized.name.trim() === '夜游潇湘' && normalized.star !== 3 ? { ...normalized, star: 3 } : normalized
}
