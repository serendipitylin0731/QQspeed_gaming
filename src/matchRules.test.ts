import { describe, expect, it } from 'vitest'
import { initialData } from './data/seed'
import { evaluateGrandRound, tracksInPool } from './matchRules'
import type { MatchState, RoundResult, Track } from './types'

const round=(scores:Record<string,number>,extra:Partial<RoundResult>={}):RoundResult=>({id:crypto.randomUUID(),trackId:'track',scores,notes:'',...extra})
const makeMatch=(patch:Partial<MatchState>={}):MatchState=>({...structuredClone(initialData.match),configured:true,...patch})

describe('grand round automation',()=>{
  it('finishes a grab-n mode as soon as a side reaches n',()=>{
    const match=makeMatch({modeParams:{...initialData.match.modeParams,n:2},rounds:[round({'team-a':1,'team-b':0}),round({'team-a':1,'team-b':0})]})
    expect(evaluateGrandRound(match)).toMatchObject({finished:true,winnerIds:['team-a']})
  })

  it('keeps an overtime match alive until a two-point lead',()=>{
    const match=makeMatch({modeParams:{...initialData.match.modeParams,n:5},specialRules:['鏖战'],specialParams:{overtimeCap:8,fullSpeedGap:3},rounds:[round({'team-a':5,'team-b':4})]})
    expect(evaluateGrandRound(match).phase).toBe('overtime')
    match.rounds.push(round({'team-a':1,'team-b':0}))
    expect(evaluateGrandRound(match)).toMatchObject({finished:true,winnerIds:['team-a']})
  })

  it('finishes blood mode when only one participant has health',()=>{
    const match=makeMatch({modeId:'多人混战滴血赛',modeParams:{...initialData.match.modeParams,n:3},rounds:[round({'team-a':-3,'team-b':-2})]})
    expect(evaluateGrandRound(match)).toMatchObject({finished:true,winnerIds:['team-b']})
  })

  it('triggers two full-speed rounds when the regulation gap is small',()=>{
    const match=makeMatch({modeId:'kvk组队积分赛',modeParams:{...initialData.match.modeParams,t:1},specialRules:['全速对决'],specialParams:{overtimeCap:8,fullSpeedGap:3},rounds:[round({'team-a':10,'team-b':8})]})
    expect(evaluateGrandRound(match)).toMatchObject({finished:false,phase:'overtime'})
    match.rounds.push(round({'team-a':3,'team-b':2}),round({'team-a':4,'team-b':1}))
    expect(evaluateGrandRound(match)).toMatchObject({finished:true,winnerIds:['team-a']})
  })

  it('uses best and second-best results for the two-run time challenge',()=>{
    const match=makeMatch({modeId:'计时挑战赛',rounds:[round({'team-a':0,'team-b':0},{playerTimes:{'team-a':61,'team-b':62}}),round({'team-a':0,'team-b':0},{playerTimes:{'team-a':60,'team-b':59}})]})
    expect(evaluateGrandRound(match)).toMatchObject({finished:true,winnerIds:['team-b']})
  })
})

describe('match track pool',()=>{
  it('applies base pool, stars and exclusions together',()=>{
    const tracks=[
      {id:'a',name:'A',star:5,pools:{sailing:false,nostalgia:false,peak:true,league:false},king:false},
      {id:'b',name:'B',star:5,pools:{sailing:true,nostalgia:false,peak:true,league:false},king:false},
      {id:'c',name:'C',star:4,pools:{sailing:false,nostalgia:false,peak:true,league:false},king:false},
    ] as Track[]
    expect(tracksInPool(tracks,{base:'peak',stars:[5],excludeSailing:true,excludeNostalgia:false,customTrackIds:[],noRepeat:false}).map(track=>track.id)).toEqual(['a'])
  })
})
