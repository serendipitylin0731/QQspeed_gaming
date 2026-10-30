import type { PoolKey } from '../types'

export const poolLabels: Record<PoolKey, string> = { sailing: '航海', nostalgia: '怀旧', peak: '巅峰赛', league: '联赛', item: '道具' }
export const emptyPools: Record<PoolKey, boolean> = { sailing: false, nostalgia: false, peak: false, league: false, item: false }
