import { describe, expect, it } from 'vitest'
import { bestTrackRecord, trackRecords } from './trackRecords'
import type { Track, TrackRecord } from '../types'

const record=(time:string,carId?:string):TrackRecord=>({time,carId,videoCode:'',updatedAt:'2026-01-01T00:00:00Z'})
const track=(extra:Partial<Track>):Track=>({id:'track',name:'赛道',star:3,coverHorizontal:'',coverVertical:'',king:false,pools:{sailing:false,nostalgia:false,peak:false,league:false,item:false},...extra})

describe('赛道赛车纪录',()=>{
  it('读取旧纪录，并在存在新列表时以新列表为准',()=>{
    const old=record('01:30.00')
    expect(trackRecords(track({record:old}))).toEqual([old])
    expect(trackRecords(track({record:old,records:[]}))).toEqual([])
  })
  it('从不同赛车的成绩中找到最短时间',()=>{
    const fast=record('1:09.10','car-a')
    expect(bestTrackRecord(track({records:[record('1:20.00','car-b'),fast,record('1:10.00','car-c')]}))).toEqual(fast)
    expect(bestTrackRecord(track({records:[record('录像待补','a'),fast]}))).toEqual(fast)
  })
})
