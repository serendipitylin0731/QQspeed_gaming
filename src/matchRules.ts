import type { MatchState, Track, WheelFilter } from './types'

export interface GrandEvaluation {
  finished: boolean
  winnerIds: string[]
  reason: string
  phase: 'playing'|'overtime'|'finished'
}

export function tracksInPool(tracks:Track[],filter:WheelFilter){
  return tracks.filter(track=>filter.stars.includes(track.star)
    &&(filter.base==='all'||filter.base==='custom'&&filter.customTrackIds.includes(track.id)||filter.base!=='custom'&&track.pools[filter.base])
    &&(!filter.excludeSailing||!track.pools.sailing)
    &&(!filter.excludeNostalgia||!track.pools.nostalgia))
}

export function poolName(filter:WheelFilter){
  const base={all:'全图池',peak:'巅峰赛图池',league:'联赛图池',custom:'自定义图池'}[filter.base]
  return `${base} · ${filter.stars.slice().sort((a,b)=>a-b).join('/')} 星${filter.noRepeat?' · 不重复':''}`
}

export function matchScores(match:MatchState,rounds=match.rounds){
  return Object.fromEntries(match.competitors.map(side=>[side.id,rounds.reduce((sum,round)=>sum+(round.scores[side.id]||0),0)]))
}

export function kingTracksInFirstRoundOrder(match:MatchState):string[]{
  if(!match.specialRules.some(rule=>rule.startsWith('赛道BP')))return []
  const ranking=match.rounds[0]?.ranking
  if(!ranking||ranking.length!==match.competitors.length||new Set(ranking).size!==ranking.length||!ranking.every(id=>match.competitors.some(side=>side.id===id)))return []
  return ranking.flatMap(id=>match.specialTrackIds[`bp:${id}:king`]||[])
}

function leaders(match:MatchState,scores:Record<string,number>){
  const best=Math.max(...match.competitors.map(side=>scores[side.id]||0))
  return match.competitors.filter(side=>(scores[side.id]||0)===best).map(side=>side.id)
}

function firstPlaceCounts(match:MatchState){
  const counts=Object.fromEntries(match.competitors.map(side=>[side.id,0]))
  for(const round of match.rounds){
    const top=leaders(match,round.scores)
    if(top.length===1)counts[top[0]]++
  }
  return counts
}

function timeChallenge(match:MatchState):GrandEvaluation{
  const completed=match.rounds.filter(round=>match.competitors.every(side=>(round.playerTimes?.[side.id]||0)>0))
  if(completed.length<2)return {finished:false,winnerIds:[],reason:`每位选手完成两次计时后自动结束（${completed.length}/2）`,phase:'playing'}
  const ordered=Object.fromEntries(match.competitors.map(side=>[side.id,completed.map(round=>round.playerTimes?.[side.id]||Infinity).sort((a,b)=>a-b)]))
  const compare=(a:string,b:string)=>{const aa=ordered[a],bb=ordered[b];for(let i=0;i<Math.max(aa.length,bb.length);i++){if((aa[i]||Infinity)!==(bb[i]||Infinity))return (aa[i]||Infinity)-(bb[i]||Infinity)}return 0}
  const ranked=match.competitors.map(side=>side.id).sort(compare)
  const winners=ranked.filter(id=>compare(id,ranked[0])===0)
  if(winners.length>1)return {finished:false,winnerIds:[],reason:'两次计时仍相同，继续加赛直至分出胜负',phase:'overtime'}
  return {finished:true,winnerIds:winners,reason:'两次计时完成，最佳成绩更快者获胜',phase:'finished'}
}

export function evaluateGrandRound(match:MatchState):GrandEvaluation{
  if(!match.rounds.length)return {finished:false,winnerIds:[],reason:'录入第一小局后开始自动判断',phase:'playing'}
  if(match.modeId==='计时挑战赛')return timeChallenge(match)
  const scores=matchScores(match)
  const top=leaders(match,scores)
  if(match.modeId.includes('滴血')){
    const initial=(match.modeId.startsWith('kvk')?Math.max(1,match.modeParams.k||2):1)*(match.modeParams.n||5)
    const alive=match.competitors.filter(side=>initial+(scores[side.id]||0)>0)
    if(alive.length>1)return {finished:false,winnerIds:[],reason:`仍有 ${alive.length} 个参赛方保有血量`,phase:'playing'}
    const winners=alive.length===1?[alive[0].id]:top
    return {finished:true,winnerIds:winners,reason:'其余参赛方血量已耗尽',phase:'finished'}
  }
  if(match.modeId.includes('积分')){
    const target=Math.max(1,match.modeParams.t||1)
    if(match.rounds.length<target)return {finished:false,winnerIds:[],reason:`完成 ${target} 小局后结算（${match.rounds.length}/${target}）`,phase:'playing'}
    if(match.specialRules.includes('全速对决')){
      const baseScores=matchScores(match,match.rounds.slice(0,target)),values=Object.values(baseScores).sort((a,b)=>b-a)
      const gap=(values[0]||0)-(values[1]||0),limit=match.specialParams.fullSpeedGap??3
      if(gap<=limit&&match.rounds.length<target+2)return {finished:false,winnerIds:[],reason:`全速对决已触发，还需完成 ${target+2-match.rounds.length} 张预选赛道`,phase:'overtime'}
    }
    if(top.length===1)return {finished:true,winnerIds:top,reason:'规定局数完成，积分最高者获胜',phase:'finished'}
    if(match.modeId==='kvk组队积分赛'){
      const counts=firstPlaceCounts(match),most=Math.max(...top.map(id=>counts[id]||0)),byFirst=top.filter(id=>(counts[id]||0)===most)
      if(byFirst.length===1)return {finished:true,winnerIds:byFirst,reason:'总分相同，第一冲线次数更多的一方获胜',phase:'finished'}
    }
    if(match.specialRules.includes('同分加赛')||match.modeId==='kvk组队积分赛')return {finished:false,winnerIds:[],reason:'总分仍相同，继续加赛直至分出胜负',phase:'overtime'}
    return {finished:true,winnerIds:top,reason:'规定局数完成，并列领先',phase:'finished'}
  }
  const target=match.modeId==='1v1绝活单挑赛'?(match.modeParams.n||1)+1:match.modeParams.n||1
  const best=Math.max(...Object.values(scores)),second=[...Object.values(scores)].sort((a,b)=>b-a)[1]||0
  const overtime=match.specialRules.includes('鏖战')||match.specialRules.includes('巅峰鏖战')
  if(overtime&&second>=target-1){
    const cap=Math.max(target,match.specialParams.overtimeCap||target+3)
    if((best-second>=2)||(best>=cap&&best>second))return {finished:true,winnerIds:top,reason:best>=cap?'鏖战达到封顶分并领先':'鏖战已领先两分',phase:'finished'}
    return {finished:false,winnerIds:[],reason:`鏖战中：需领先两分，或先到 ${cap} 分且领先`,phase:'overtime'}
  }
  if(best>=target)return {finished:true,winnerIds:top,reason:`已达到获胜目标 ${target} 分`,phase:'finished'}
  return {finished:false,winnerIds:[],reason:`先达到 ${target} 分者结束本大局`,phase:'playing'}
}
