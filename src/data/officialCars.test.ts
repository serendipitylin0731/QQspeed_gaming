import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { groupOfficialCars } = require('../../electron/official-data.cjs')

describe('official car grouping', () => {
  it('groups source variants as skins of one base car', () => {
    const cars = groupOfficialCars([
      { cid_d3:'T1', cm_4e:'源极之星EXA', jb_43:'T', tt_8a:'//base.png', slt_3c:'//base-cut.png' },
      { cid_d3:'T12', cm_4e:'源极之星 大河神卫', jb_43:'T', tt_8a:'//river.png', slt_3c:'//river-cut.png' },
      { cid_d3:'T88', cm_4e:'源极之星 风间墨影', jb_43:'T', tt_8a:'//ink.png', slt_3c:'//ink-cut.png' },
    ])
    expect(cars).toHaveLength(1)
    expect(cars[0].name).toBe('源极之星')
    expect(cars[0].skins.map((skin:{name:string})=>skin.name)).toEqual(['原皮','大河神卫','风间墨影'])
  })
})
