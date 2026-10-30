import { useCallback, useEffect, useState } from 'react'
import { initialData } from '../data/seed'
import { correctTrack } from '../data/trackCorrections'
import { emptyPools } from '../data/pools'
import type { AppData, Car, Track } from '../types'

const STORAGE_KEY = 'qqspeed-vault-data-v2'

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialData
    const parsed = JSON.parse(raw)
    const cleanTracks = (parsed.tracks || []).filter((track: Track) => !track.id.startsWith('seed-')).map(correctTrack)
    const cleanCars = (parsed.cars || []).filter((car: Car) => !/^car-\d+$/.test(car.id)).map((car:Car)=>({ ...car, tags: car.tags || [] }))
    return {
      ...initialData,
      ...parsed,
      tracks: cleanTracks,
      cars: cleanCars,
      matchArchives: parsed.matchArchives || [],
      match: { ...initialData.match, ...parsed.match, teamsConfigured: parsed.match?.teamsConfigured ?? Boolean(parsed.match?.configured), useTeamNames: parsed.match?.useTeamNames ?? !parsed.match?.competitors?.some((side: {players?:unknown[]})=>side.players?.length), modeParams: parsed.match?.modeParams || initialData.match.modeParams, specialRules: parsed.match?.specialRules || [], specialParams: parsed.match?.specialParams || initialData.match.specialParams, specialTrackIds: parsed.match?.specialTrackIds || {}, specialSetupComplete: parsed.match?.specialSetupComplete ?? Boolean(parsed.match?.rounds?.length), trackPool: { ...initialData.match.trackPool, ...(parsed.match?.trackPool || {}), noRepeat: true }, completedGrandRounds: parsed.match?.completedGrandRounds || [] },
    }
  } catch { return initialData }
}

export function useAppData() {
  const [data, setData] = useState<AppData>(load)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }, [data])

  const syncOfficial = useCallback(async (quiet = false) => {
    if (!window.qqspeed || syncing) return
    setSyncing(true)
    if (!quiet) setSyncMessage('正在读取官网数据…')
    try {
      const result = await window.qqspeed.syncOfficial()
      setData((current) => {
        const existingMaps = new Map(current.tracks.map((x) => [x.id, x]))
        const existingCars = new Map(current.cars.map((x) => [x.id, x]))
        const officialMaps = result.maps.map((fresh) => {
          const old = existingMaps.get(fresh.id!)
          return correctTrack({ king: false, ...fresh, ...old, pools: { ...emptyPools, ...fresh.pools, ...old?.pools },
            name: fresh.name!, star: fresh.star!, coverHorizontal: fresh.coverHorizontal!, coverVertical: fresh.coverVertical! } as Track)
        })
        const officialCars = result.cars.map((fresh) => {
          const old = existingCars.get(fresh.id)
          if (!old) return fresh
          const skins = [...fresh.skins, ...old.skins.filter(skin=>!skin.id.startsWith('official-skin-'))]
          return { ...fresh, skins, selectedSkinId: skins.some(skin=>skin.id===old.selectedSkinId) ? old.selectedSkinId : fresh.selectedSkinId }
        }) as Car[]
        const customMaps = current.tracks.filter((x) => x.id.startsWith('custom-'))
        const customCars = current.cars.filter((x) => x.id.startsWith('custom-'))
        return { ...current, tracks: [...officialMaps, ...customMaps], cars: [...officialCars, ...customCars], lastSync: result.syncedAt }
      })
      setSyncMessage(`同步完成：${result.maps.length} 张地图，${result.cars.length} 辆赛车`)
    } catch (error) {
      setSyncMessage(`同步失败：${error instanceof Error ? error.message : '网络不可用'}`)
    } finally { setSyncing(false) }
  }, [syncing])

  useEffect(() => { if (window.qqspeed) syncOfficial(true) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback((recipe: (current: AppData) => AppData) => setData(recipe), [])
  const replace = useCallback((next: AppData) => setData({ ...next, tracks: next.tracks.map(correctTrack), match: { ...next.match, trackPool: { ...next.match.trackPool, noRepeat: true } } }), [])
  return { data, update, replace, syncing, syncMessage, syncOfficial }
}
