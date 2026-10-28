import { useCallback, useEffect, useState } from 'react'
import { initialData } from '../data/seed'
import type { AppData, Car, Track } from '../types'

const STORAGE_KEY = 'qqspeed-vault-data-v1'

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...initialData, ...JSON.parse(raw) } : initialData
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
          return { pools: { sailing: false, nostalgia: false, peak: false, league: false }, king: false, ...fresh, ...old,
            name: fresh.name!, star: fresh.star!, coverHorizontal: fresh.coverHorizontal!, coverVertical: fresh.coverVertical! } as Track
        })
        const officialCars = result.cars.map((fresh) => {
          const old = existingCars.get(fresh.id)
          return old ? { ...fresh, ...old, name: fresh.name, grade: fresh.grade } : fresh
        }) as Car[]
        const customMaps = current.tracks.filter((x) => !x.id.startsWith('official-map-'))
        const customCars = current.cars.filter((x) => !x.id.startsWith('official-car-'))
        return { ...current, tracks: [...officialMaps, ...customMaps], cars: [...officialCars, ...customCars], lastSync: result.syncedAt }
      })
      setSyncMessage(`同步完成：${result.maps.length} 张地图，${result.cars.length} 辆赛车`)
    } catch (error) {
      setSyncMessage(`同步失败：${error instanceof Error ? error.message : '网络不可用'}`)
    } finally { setSyncing(false) }
  }, [syncing])

  useEffect(() => { if (window.qqspeed && !data.lastSync) syncOfficial(true) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback((recipe: (current: AppData) => AppData) => setData(recipe), [])
  const replace = useCallback((next: AppData) => setData(next), [])
  return { data, update, replace, syncing, syncMessage, syncOfficial }
}
