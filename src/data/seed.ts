import type { AppData, Car, Track } from '../types'

const mapCover = (seed: string) => `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1000&q=78`

export const seedTracks: Track[] = [
  ['seed-1','秋名山',5,'1500530855697-b586d89ba3ee'],
  ['seed-2','西部矿山',5,'1519501025264-65ba15a82390'],
  ['seed-3','美洲大峡谷',6,'1500534314209-a25ddb2bd429'],
  ['seed-4','十一城',4,'1514565131-fce0801e5785'],
  ['seed-5','亚特兰蒂斯',5,'1500375592092-40eb2168fd21'],
  ['seed-6','云端长城',6,'1518005020951-eccb494ad742'],
  ['seed-7','沁园春',4,'1470252649378-9c29740c9fa8'],
  ['seed-8','莫高窟',5,'1539650116574-75c0c6d73f6e'],
  ['seed-9','夜鸣沙都',5,'1519681393784-d120267933ba'],
  ['seed-10','极地海龙湾',3,'1517299321609-52687d1bc55a'],
  ['seed-11','故园归醉',6,'1509316785289-025f5b846b35'],
  ['seed-12','星星火车站',3,'1515694346937-94d85e41e6f0'],
].map(([id,name,star,img], index) => ({
  id: String(id), name: String(name), star: Number(star),
  coverHorizontal: mapCover(String(img)), coverVertical: mapCover(String(img)),
  pools: { sailing: index === 4 || index === 9, nostalgia: index === 1 || index === 3, peak: index < 8, league: index % 3 !== 2 },
  king: index === 0 || index === 5,
  record: index === 0 ? { time: '01:27.64', videoCode: 'QFS-7A2K9', updatedAt: new Date().toISOString() } : undefined,
}))

export const seedCars: Car[] = [
  ['car-1','黑夜传说','A','1511910849309-0dffb8785146'],
  ['car-2','璀璨之星','A','1494976388531-d1058494cdd8'],
  ['car-3','针尖','A','1542362567-b07e54358753'],
  ['car-4','雷诺','A','1503736334956-4c8f8e92946d'],
  ['car-5','赤焰天启','A','1515562141207-7a88fb7ce338'],
  ['car-6','兰博基尼','T','1517677126-35b0c9c2c4fa'],
].map(([id,name,grade,img], index) => {
  const base = mapCover(String(img))
  const skin2 = mapCover(index % 2 ? '1503736334956-4c8f8e92946d' : '1511910849309-0dffb8785146')
  return { id, name, grade, selectedSkinId: `${id}-base`, skins: [
    { id: `${id}-base`, name: '原皮', cover: base, cutout: base },
    { id: `${id}-skin`, name: index % 2 ? '星海' : '幻夜', cover: skin2, cutout: skin2 },
  ] }
})

export const initialData: AppData = {
  tracks: seedTracks,
  cars: seedCars,
  wheels: [],
  match: {
    modeId: '1v1单挑抢n',
    competitors: [
      { id: 'team-a', name: '蓝队', grandScore: 0, score: 0, color: '#42a5ff' },
      { id: 'team-b', name: '橙队', grandScore: 0, score: 0, color: '#ff8a47' },
    ],
    rounds: [], activeRound: 0,
  },
}
