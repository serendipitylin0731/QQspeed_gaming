import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { groupOfficialCars, normalizeOfficialMaps } = require('../../electron/official-data.cjs')

describe('official car grouping', () => {
  it('groups source variants as skins of one base car', () => {
    const cars = groupOfficialCars([
      { cid_d3:'T1', cm_4e:'源极之星EXA', jb_43:'T', tt_8a:'//base.png', slt_3c:'//base-cut.png' },
      { cid_d3:'T12', cm_4e:'源极之星 大河神卫', jb_43:'T', tt_8a:'//river.png', slt_3c:'//river-cut.png' },
      { cid_d3:'T88', cm_4e:'源极之星 风间墨影', jb_43:'T', tt_8a:'//ink.png', slt_3c:'//ink-cut.png' },
    ])
    expect(cars).toHaveLength(1)
    expect(cars[0].name).toBe('源极之星EXA')
    expect(cars[0].skins.map((skin:{name:string})=>skin.name)).toEqual(['原皮','大河神卫','风间墨影'])
  })

  it('merges confirmed coded originals and named skins', () => {
    const cars = groupOfficialCars([
      { cid_d3:'T2', cm_4e:'序列未来LYR', jb_43:'T' },
      { cid_d3:'T3', cm_4e:'序列未来-燃冰球手', jb_43:'T' },
      { cid_d3:'T6', cm_4e:'序列未来 贯星', jb_43:'T' },
      { cid_d3:'A108', cm_4e:'天狼星', jb_43:'A' },
      { cid_d3:'A109', cm_4e:'天狼星-黄忠', jb_43:'A' },
      { cid_d3:'A230', cm_4e:'S-时序使者', jb_43:'A' },
      { cid_d3:'A339', cm_4e:'时序使者 曼语', jb_43:'A' },
      { cid_d3:'A359', cm_4e:'时序 花影鹊梦', jb_43:'A' },
    ])
    expect(cars.find((car:{name:string})=>car.name==='序列未来LYR').skins.map((skin:{name:string})=>skin.name)).toEqual(['原皮','燃冰球手','贯星'])
    expect(cars.find((car:{name:string})=>car.name==='天狼星').skins.map((skin:{name:string})=>skin.name)).toEqual(['原皮','黄忠'])
    expect(cars.find((car:{name:string})=>car.name==='S-时序使者').skins.map((skin:{name:string})=>skin.name)).toEqual(['原皮','曼语','花影鹊梦'])
  })

  it('groups Dawn and all S-series league cars with league tags', () => {
    const cars = groupOfficialCars([
      { cid_d3:'a28', cm_4e:'S-破晓者', jb_43:'A' },
      { cid_d3:'A126', cm_4e:'破晓者-启明星', jb_43:'A' },
      { cid_d3:'A154', cm_4e:'S-天行者', jb_43:'A' },
      { cid_d3:'A158', cm_4e:'天行者-RSG', jb_43:'A' },
    ])
    expect(cars).toHaveLength(2)
    expect(cars.find((car:{name:string})=>car.name==='S-破晓者').skins.map((skin:{name:string})=>skin.name)).toEqual(['原皮','启明星'])
    expect(cars.find((car:{name:string})=>car.name==='S-天行者').skins.map((skin:{name:string})=>skin.name)).toEqual(['原皮','RSG'])
    expect(cars.every((car:{tags:string[]})=>car.tags.includes('联赛车'))).toBe(true)
  })

  it('uses coded originals and merges the confirmed manufacturers', () => {
    const cars = groupOfficialCars([
      { cid_d3:'A81', cm_4e:'指挥官SPX', jb_43:'A' }, { cid_d3:'A103', cm_4e:'指挥官-粉墨', jb_43:'A' },
      { cid_d3:'A160', cm_4e:'兰博基尼RAC', jb_43:'A' }, { cid_d3:'A170', cm_4e:'兰博基尼-云海', jb_43:'A' },
      { cid_d3:'A115', cm_4e:'迈凯伦600LT', jb_43:'A' }, { cid_d3:'A116', cm_4e:'迈凯伦-星虹', jb_43:'A' },
      { cid_d3:'A314', cm_4e:'布加迪BOLIDE', jb_43:'A' }, { cid_d3:'A315', cm_4e:'布加迪 DRAGON', jb_43:'A' },
      { cid_d3:'A353', cm_4e:'阿斯顿马丁Valkyrie', jb_43:'A' }, { cid_d3:'A354', cm_4e:'阿斯顿马丁 耀翼', jb_43:'A' },
    ])
    expect(cars).toHaveLength(5)
    expect(cars.find((car:{name:string})=>car.name==='指挥官SPX').skins.map((skin:{name:string})=>skin.name)).toEqual(['原皮','粉墨'])
    expect(cars.find((car:{name:string})=>car.name==='兰博基尼RAC').skins.map((skin:{name:string})=>skin.name)).toEqual(['原皮','云海'])
    expect(cars.find((car:{name:string})=>car.name==='迈凯伦600LT').skins.map((skin:{name:string})=>skin.name)).toEqual(['原皮','星虹'])
    expect(cars.find((car:{name:string})=>car.name==='布加迪BOLIDE').skins.map((skin:{name:string})=>skin.name)).toEqual(['原皮','DRAGON'])
    expect(cars.find((car:{name:string})=>car.name==='阿斯顿马丁Valkyrie').skins.map((skin:{name:string})=>skin.name)).toEqual(['原皮','耀翼'])
  })
})

describe('official map normalization', () => {
  it('uses the website list thumbnail instead of the detail banner', () => {
    const [track] = normalizeOfficialMaps([{ dtid_87:'37', dtm_88:'秋名山', jytg_a3:'5', tt_8a:'//detail.jpg', slt_3c:'//list-cover.jpg' }])
    expect(track.coverHorizontal).toBe('https://list-cover.jpg')
    expect(track.coverVertical).toBe('https://list-cover.jpg')
  })
})
