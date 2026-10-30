import type { Track, TrackRecord } from '../types'

export const MAX_TRACK_RECORDS = 5

export function trackRecords(track: Track): TrackRecord[] {
  return track.records ?? (track.record ? [track.record] : [])
}

function timeInSeconds(time: string): number | undefined {
  const parts = time.trim().split(':')
  if (parts.length > 3 || !parts.every(part => /^\d+(?:\.\d+)?$/.test(part))) return undefined
  return parts.reduce((total, part) => total * 60 + Number(part), 0)
}

export function bestTrackRecord(track: Track): TrackRecord | undefined {
  return trackRecords(track).filter(record => record.time.trim()).reduce<TrackRecord | undefined>((best, record) => {
    if (!best) return record
    const current = timeInSeconds(record.time), previous = timeInSeconds(best.time)
    return current !== undefined && (previous === undefined || current < previous) ? record : best
  }, undefined)
}
