import type { Track } from '../types'

export function correctTrack(track: Track): Track {
  return track.name.trim() === '夜游潇湘' && track.star !== 3 ? { ...track, star: 3 } : track
}
