import { describe, expect, it } from 'vitest'
import { initialData } from './data/seed'
import { activeTeamPlayers, bestPlayerScores, bpFeatures, displayModeName, evaluateGrandRound, firstPlaceCandidates, kingTracksInFirstRoundOrder, matchTrackCandidates, nextFullSpeedTrack, nextKingTrack, normalizeBpRules, pickAuthority, rankRoundScores, tracksInPool, trailingSide } from './matchRules'
import { correctTrack } from './data/trackCorrections'
import type { MatchState, RoundResult, Track } from './types'

const round=(scores:Record<string,number>,extra:Partial<RoundResult>={}):RoundResult=>({id:crypto.randomUUID(),trackId:'track',scores,notes:'',...extra})
const makeMatch=(patch:Partial<MatchState>={}):MatchState=>({...structuredClone(initialData.match),configured:true,...patch})

describe('赛道星级和比赛选图',()=>{
  const track=(id:string,name:string,star:number):Track=>({id,name,star,coverHorizontal:'',coverVertical:'',king:false,pools:{sailing:false,nostalgia:false,peak:false,league:false}})
  const tracks=[track('a','夜游潇湘',5),track('alias','夜游潇湘',3),track('b','赛道乙',5),track('ban','禁图',5),track('ban-alias','禁图',5),track('c','赛道丙',3)]
  it('修正夜游潇湘星级，保留赛道其他资料',()=>{
    expect(correctTrack({...tracks[0],king:true})).toMatchObject({name:'夜游潇湘',star:3,king:true})
    expect(correctTrack(tracks[2])).toBe(tracks[2])
  })
  it('普通比赛即使旧设置允许重复，也排除已使用和被禁的同名赛道',()=>{
    const match=makeMatch({trackPool:{...initialData.match.trackPool,noRepeat:false},specialRules:['赛道BP（Ban 图）'],specialTrackIds:{'bp:team-a:ban':['ban']},rounds:[round({'team-a':1,'team-b':0},{trackId:'a'})]})
    expect(matchTrackCandidates(match,tracks).map(t=>t.id)).toEqual(['b','c'])
  })
  it('巅峰鏖战刷新所有五星及以上赛道，允许已用赛道但排除 Ban 图',()=>{
    const match=makeMatch({modeId:'1v1单挑抢n',modeParams:{...initialData.match.modeParams,n:2},trackPool:{...initialData.match.trackPool,stars:[3]},specialRules:['巅峰鏖战','赛道BP（Ban 图）'],specialTrackIds:{'bp:team-a:ban':['ban']},rounds:[round({'team-a':1,'team-b':1},{trackId:'a'})]})
    expect(matchTrackCandidates(match,tracks).map(t=>t.id)).toEqual(['a','b'])
  })
  it('旧比赛的王图队列跳过已经使用的同名赛道',()=>{
    const match=makeMatch({specialRules:['赛道BP（王图）'],specialTrackIds:{'bp:team-a:king':['alias'],'bp:team-b:king':['b']},rounds:[round({'team-a':1,'team-b':0},{trackId:'a',ranking:['team-a','team-b']})]})
    expect(nextKingTrack(match,tracks)).toBe('b')
  })
  it('全速对决预选赛道即使已经使用也自动安排',()=>{
    const match=makeMatch({modeId:'kvk组队积分赛',modeParams:{...initialData.match.modeParams,t:1},specialRules:['全速对决'],specialTrackIds:{'fullSpeed:team-a':['b'],'fullSpeed:team-b':['a']},rounds:[round({'team-a':10,'team-b':9},{trackId:'a'})]})
    expect(nextFullSpeedTrack(match)).toBe('a')
  })
})

describe('grand round automation',()=>{
  it('switches both relay teams when the leading score reaches the next leg',()=>{
    const match=makeMatch({modeId:'kvk接力抢n',modeParams:{...initialData.match.modeParams,k:2,n:7},competitors:initialData.match.competitors.map(side=>({...side,players:[{id:`${side.id}-1`,name:'首棒'},{id:`${side.id}-2`,name:'第二棒'}]}))})
    expect(activeTeamPlayers(match)['team-a']?.playerId).toBe('team-a-1')
    match.rounds=[round({'team-a':3,'team-b':1})]
    expect(activeTeamPlayers(match)['team-b']?.playerId).toBe('team-b-1')
    match.rounds.push(round({'team-a':1,'team-b':0}))
    expect(activeTeamPlayers(match)['team-a']?.playerId).toBe('team-a-2')
    expect(activeTeamPlayers(match)['team-b']?.playerId).toBe('team-b-2')
  })
  it('advances through all three relay legs at their score thresholds',()=>{
    const match=makeMatch({modeId:'kvk接力抢n',modeParams:{...initialData.match.modeParams,k:3,n:7},competitors:initialData.match.competitors.map(side=>({...side,players:[1,2,3].map(index=>({id:`${side.id}-${index}`,name:`第${index}棒`}))}))})
    match.rounds=[round({'team-a':3,'team-b':2})]
    expect(activeTeamPlayers(match)['team-a']?.playerId).toBe('team-a-2')
    match.rounds.push(round({'team-a':1,'team-b':2}))
    expect(activeTeamPlayers(match)['team-b']?.playerId).toBe('team-b-2')
    match.rounds.push(round({'team-a':1,'team-b':0}))
    expect(activeTeamPlayers(match)['team-a']?.playerId).toBe('team-a-3')
    expect(activeTeamPlayers(match)['team-b']?.playerId).toBe('team-b-3')
  })
  it('advances blood competitors separately only after their active player loses all health',()=>{
    const match=makeMatch({modeId:'kvk组队滴血赛',modeParams:{...initialData.match.modeParams,k:2,n:2},competitors:initialData.match.competitors.map(side=>({...side,players:[{id:`${side.id}-1`,name:'第一位'},{id:`${side.id}-2`,name:'第二位'}]}))})
    match.rounds=[round({'team-a':-1,'team-b':0},{playerScores:{'team-a:team-a-1':-1}})]
    expect(activeTeamPlayers(match)['team-a']).toMatchObject({playerId:'team-a-1',health:1})
    match.rounds.push(round({'team-a':-1,'team-b':0},{playerScores:{'team-a:team-a-1':-1}}))
    expect(activeTeamPlayers(match)['team-a']).toMatchObject({playerId:'team-a-2',health:2})
    expect(activeTeamPlayers(match)['team-b']).toMatchObject({playerId:'team-b-1',health:2})
    match.rounds.push(round({'team-a':0,'team-b':-2}))
    expect(activeTeamPlayers(match)['team-b']).toMatchObject({playerId:'team-b-2',health:2})
  })
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
  it('queues the trailing team’s full-speed map first and the other map second',()=>{
    const match=makeMatch({modeId:'kvk组队积分赛',modeParams:{...initialData.match.modeParams,t:2},specialRules:['全速对决'],specialTrackIds:{'fullSpeed:team-a':['map-a'],'fullSpeed:team-b':['map-b']},rounds:[round({'team-a':10,'team-b':7}),round({'team-a':5,'team-b':7})]})
    expect(nextFullSpeedTrack(match)).toBe('map-b')
    match.rounds.push(round({'team-a':3,'team-b':5},{recorded:false}))
    expect(nextFullSpeedTrack(match)).toBeUndefined()
    match.rounds[2].recorded=true
    expect(nextFullSpeedTrack(match)).toBe('map-a')
  })
  it('uses the latest caught-up team for tied full-speed selection',()=>{
    const match=makeMatch({modeId:'kvk组队积分赛',modeParams:{...initialData.match.modeParams,t:2},specialRules:['全速对决'],specialTrackIds:{'fullSpeed:team-a':['map-a'],'fullSpeed:team-b':['map-b']},rounds:[round({'team-a':10,'team-b':7}),round({'team-a':5,'team-b':8})]})
    expect(nextFullSpeedTrack(match)).toBe('map-a')
  })

  it('honors a zero-point full-speed trigger threshold',()=>{
    const match=makeMatch({modeId:'kvk组队积分赛',modeParams:{...initialData.match.modeParams,t:1},specialRules:['全速对决'],specialParams:{overtimeCap:8,fullSpeedGap:0},rounds:[round({'team-a':10,'team-b':9})]})
    expect(evaluateGrandRound(match)).toMatchObject({finished:true,winnerIds:['team-a']})
  })

  it('uses best and second-best results for the two-run time challenge',()=>{
    const match=makeMatch({modeId:'计时挑战赛',rounds:[round({'team-a':0,'team-b':0},{playerTimes:{'team-a':61,'team-b':62}}),round({'team-a':0,'team-b':0},{playerTimes:{'team-a':60,'team-b':59}})]})
    expect(evaluateGrandRound(match)).toMatchObject({finished:true,winnerIds:['team-b']})
  })
})

describe('match track pool',()=>{
  it('keeps king and ban BP independently configurable and maps older rules',()=>{
    expect(bpFeatures([])).toEqual({king:false,ban:false})
    expect(bpFeatures(['赛道BP（王图）'])).toEqual({king:true,ban:false})
    expect(bpFeatures(['赛道BP（Ban 图）'])).toEqual({king:false,ban:true})
    expect(bpFeatures(['赛道BP（王图）','赛道BP（Ban 图）'])).toEqual({king:true,ban:true})
    expect(bpFeatures(['赛道BP'])).toEqual({king:true,ban:true})
    expect(normalizeBpRules(['赛道BP','全速对决'])).toEqual(['全速对决','赛道BP（王图）','赛道BP（Ban 图）'])
    expect(normalizeBpRules(['赛道BP（仅禁图）'])).toEqual(['赛道BP（Ban 图）'])
  })
  it('identifies first place by individual score, not the team total',()=>{
    const match=makeMatch({modeId:'kvk组队积分赛',competitors:[{...initialData.match.competitors[0],players:[{id:'a1',name:'a1'},{id:'a2',name:'a2'}]},{...initialData.match.competitors[1],players:[{id:'b1',name:'b1'},{id:'b2',name:'b2'}]}]})
    const scores={'team-a:a1':11,'team-a:a2':1,'team-b:b1':9,'team-b:b2':9}
    expect(bestPlayerScores(match,scores)).toEqual({'team-a':11,'team-b':9})
    expect(firstPlaceCandidates(match,scores)).toEqual(['team-a'])
    expect(firstPlaceCandidates(match,{...scores,'team-b:b1':11})).toEqual(['team-a','team-b'])
    expect(firstPlaceCandidates(match,{...scores,'team-a:a2':11})).toEqual(['team-a'])
    match.rounds=[round({'team-a':12,'team-b':12},{playerScores:scores,firstPlaceId:'team-b'})]
    expect(trailingSide(match)).toBe('team-b')
  })
  it('uses the most recently caught-up team when the total is tied',()=>{
    const match=makeMatch({modeId:'kvk组队积分赛',rounds:[round({'team-a':10,'team-b':5}),round({'team-a':1,'team-b':6}),round({'team-a':1,'team-b':3}),round({'team-a':4,'team-b':2})]})
    expect(trailingSide(match)).toBe('team-b')
    expect(pickAuthority(match)).toContain('橙队')
  })
  it('uses the team without first place if scores have always been tied',()=>{
    const match=makeMatch({modeId:'kvk组队积分赛',rounds:[round({'team-a':5,'team-b':5}),round({'team-a':6,'team-b':6},{firstPlaceId:'team-a'})]})
    expect(trailingSide(match)).toBe('team-b')
    match.rounds[1].firstPlaceId=undefined
    expect(trailingSide(match)).toBeUndefined()
  })
  it('uses the team behind on an unequal score regardless of the previous lead',()=>{
    const match=makeMatch({rounds:[round({'team-a':10,'team-b':5}),round({'team-a':1,'team-b':4})]})
    expect(trailingSide(match)).toBe('team-b')
  })
  it('ranks scores automatically and asks for order only for equal scores',()=>{
    expect(rankRoundScores(['a','b'],{a:7,b:10})).toEqual(['b','a'])
    expect(rankRoundScores(['a','b'],{a:10,b:10})).toBeNull()
    expect(rankRoundScores(['a','b'],{a:10,b:10},['b','a'])).toEqual(['b','a'])
    expect(rankRoundScores(['a','b','c'],{a:10,b:10,c:4},['b','a'])).toEqual(['b','a','c'])
  })
  it('shows actual matchup and target without the number of rounds',()=>{
    expect(displayModeName('kvk组队积分赛',{k:2,t:5})).toBe('2v2组队积分赛')
    expect(displayModeName('kvk组队抢n',{k:3,n:7})).toBe('3v3组队抢7')
    expect(displayModeName('1v1单挑抢n',{n:5})).toBe('1v1单挑抢5')
  })
  it('orders each side’s king track by the recorded first-round ranking',()=>{
    const match=makeMatch({specialRules:['赛道BP'],specialTrackIds:{'bp:team-a:king':['king-a'],'bp:team-b:king':['king-b']},rounds:[round({'team-a':3,'team-b':5},{ranking:['team-b','team-a']})]})
    expect(kingTracksInFirstRoundOrder(match)).toEqual(['king-b','king-a'])
    match.rounds[0].ranking=['team-a']
    expect(kingTracksInFirstRoundOrder(match)).toEqual([])
  })
  it('does not schedule king tracks in relay ban-only BP',()=>{
    const match=makeMatch({modeId:'kvk接力抢n',specialRules:['赛道BP（仅禁图）'],specialTrackIds:{'bp:team-a:king':['old-king']},rounds:[round({'team-a':1,'team-b':0},{ranking:['team-a','team-b']})]})
    expect(kingTracksInFirstRoundOrder(match)).toEqual([])
  })
  it('applies base pool, stars and exclusions together',()=>{
    const tracks=[
      {id:'a',name:'A',star:5,pools:{sailing:false,nostalgia:false,peak:true,league:false},king:false},
      {id:'b',name:'B',star:5,pools:{sailing:true,nostalgia:false,peak:true,league:false},king:false},
      {id:'c',name:'C',star:4,pools:{sailing:false,nostalgia:false,peak:true,league:false},king:false},
    ] as Track[]
    expect(tracksInPool(tracks,{base:'peak',stars:[5],excludeSailing:true,excludeNostalgia:false,customTrackIds:[],noRepeat:false}).map(track=>track.id)).toEqual(['a'])
  })
})
