export type PoolKey = 'sailing' | 'nostalgia' | 'peak' | 'league'

export interface TrackRecord {
  time: string
  videoCode: string
  qrImage?: string
  updatedAt: string
}

export interface Track {
  id: string
  name: string
  star: number
  coverHorizontal: string
  coverVertical: string
  description?: string
  pools: Record<PoolKey, boolean>
  king: boolean
  record?: TrackRecord
}

export interface CarSkin {
  id: string
  name: string
  cover: string
  cutout: string
}

export interface Car {
  id: string
  name: string
  grade: string
  tags: string[]
  description?: string
  skins: CarSkin[]
  selectedSkinId: string
}

export interface WheelFilter {
  base: 'all' | 'peak' | 'league' | 'custom'
  stars: number[]
  excludeSailing: boolean
  excludeNostalgia: boolean
  customTrackIds: string[]
  noRepeat: boolean
}

export interface WheelConfig {
  id: string
  name: string
  filter: WheelFilter
  drawnIds: string[]
  createdAt: string
}

export interface MatchPlayer { id: string; name: string }
export interface Competitor { id: string; name: string; grandScore: number; score: number; color: string; avatar?: string; players?: MatchPlayer[] }
export interface RoundResult {
  id: string
  trackId: string
  scores: Record<string, number>
  notes: string
  winnerIds?: string[]
  playerScores?: Record<string, number>
  playerTimes?: Record<string, number>
}
export interface CompletedGrandRound { id: string; modeId: string; specialRules: string[]; rounds: RoundResult[]; finalScores: Record<string, number>; winnerIds: string[]; completedAt: string }
export interface MatchState {
  modeId: string
  modeParams: Record<string, number>
  specialRules: string[]
  competitors: Competitor[]
  rounds: RoundResult[]
  completedGrandRounds: CompletedGrandRound[]
  activeRound: number
  configured: boolean
  showGrandScore: boolean
}

export interface SavedMatch {
  id: string
  name: string
  savedAt: string
  match: MatchState
}

export interface AppData {
  tracks: Track[]
  cars: Car[]
  wheels: WheelConfig[]
  match: MatchState
  matchArchives: SavedMatch[]
  lastSync?: string
}

declare global {
  interface Window {
    qqspeed?: {
      syncOfficial: () => Promise<{ syncedAt: string; maps: Partial<Track>[]; cars: Car[] }>
      appInfo: () => Promise<{ version: string; platform: string }>
      openExternal: (url: string) => Promise<void>
    }
  }
}
