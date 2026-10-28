import type { AppData } from '../types'

// 官方数据会在 Electron 启动后同步。初始数据保持为空，避免演示条目与官网条目重复。
export const initialData: AppData = {
  tracks: [],
  cars: [],
  wheels: [],
  matchArchives: [],
  match: {
    modeId: '1v1单挑抢n',
    modeParams: { n: 5, k: 2, m: 3, t: 5 },
    specialRules: [],
    competitors: [
      { id: 'team-a', name: '蓝队', grandScore: 0, score: 0, color: '#42a5ff' },
      { id: 'team-b', name: '橙队', grandScore: 0, score: 0, color: '#ff8a47' },
    ],
    rounds: [],
    completedGrandRounds: [],
    activeRound: 0,
    configured: false,
    showGrandScore: true,
  },
}
