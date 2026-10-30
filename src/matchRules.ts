import type { MatchState, Track, WheelFilter } from './types'

export interface GrandEvaluation {
  finished: boolean
  winnerIds: string[]
  reason: string
  phase: 'playing'|'overtime'|'finished'
}

export function bpFeatures(rules:string[]){
  return {king:rules.includes('赛道BP')||rules.includes('赛道BP（王图）'),ban:rules.includes('赛道BP')||rules.includes('赛道BP（仅禁图）')||rules.includes('赛道BP（Ban 图）')}
}

export function normalizeBpRules(rules:string[]){
  const {king,ban}=bpFeatures(rules)
  return [...rules.filter(rule=>!['赛道BP','赛道BP（王图）','赛道BP（仅禁图）','赛道BP（Ban 图）'].includes(rule)),...(king?['赛道BP（王图）']:[]),...(ban?['赛道BP（Ban 图）']:[])]
}

export function displayModeName(modeId:string,params:Record<string,number>):string{
  const size=params.k
  const name=modeId.replace(/^kvk/,size?`${size}v${size}`:'kvk').replace(/n/g,params.n?String(params.n):'n')
  const suffix=modeId==='kvk组队计时赛'&&params.n?` · 抢${params.n}分`:modeId.includes('滴血赛')&&params.n?` · ${params.n}血`:''
  return name+suffix
}

export function tracksInPool(tracks:Track[],filter:WheelFilter){
  return tracks.filter(track=>filter.stars.includes(track.star)
    &&(filter.base==='all'||filter.base==='custom'&&filter.customTrackIds.includes(track.id)||filter.base!=='custom'&&track.pools[filter.base])
    &&(!filter.excludeSailing||!track.pools.sailing)
    &&(!filter.excludeNostalgia||!track.pools.nostalgia))
}

export function trackIsAmong(track:Track, ids:string[], tracks:Track[]){
  return ids.includes(track.id)||tracks.some(other=>ids.includes(other.id)&&other.name.trim()===track.name.trim())
}

export function matchTrackCandidates(match:MatchState,tracks:Track[]){
  const banned=bpFeatures(match.specialRules).ban?Object.entries(match.specialTrackIds).filter(([key])=>key.startsWith('bp:')&&key.endsWith(':ban')).flatMap(([,ids])=>ids):[]
  const peak=match.specialRules.includes('巅峰鏖战')&&evaluateGrandRound(match).phase==='overtime'
  const available=peak?tracks.filter(track=>track.star>=5):tracksInPool(tracks,match.trackPool)
  const used=match.rounds.map(round=>round.trackId)
  return available.filter(track=>!trackIsAmong(track,banned,tracks)&&(peak||!trackIsAmong(track,used,tracks)))
}

export function poolName(filter:WheelFilter){
  const base={all:'全图池',peak:'巅峰赛图池',league:'联赛图池',item:'道具图池',custom:'自定义图池'}[filter.base]
  return `${base} · ${filter.stars.slice().sort((a,b)=>a-b).join('/')} 星${filter.noRepeat?' · 不重复':''}`
}

export function matchScores(match:MatchState,rounds=match.rounds){
  return Object.fromEntries(match.competitors.map(side=>[side.id,rounds.reduce((sum,round)=>sum+(round.scores[side.id]||0),0)]))
}

export interface ActiveTeamPlayer { playerId:string; index:number; health?:number }

export function activeTeamPlayers(match:MatchState,rounds:MatchState['rounds']=match.rounds):Record<string,ActiveTeamPlayer|undefined>{
  const result:Record<string,ActiveTeamPlayer|undefined>={}
  const completed=rounds.filter(round=>round.recorded!==false)
  if(match.modeId==='kvk接力抢n'){
    const size=Math.max(1,match.modeParams.k||2),target=Math.max(1,match.modeParams.n||1)
    const best=Math.max(0,...Object.values(matchScores(match,completed)))
    const thresholds=Array.from({length:size-1},(_,index)=>index===0?Math.floor(target/size)+1:index===size-2?target-Math.floor(target/size):Math.floor(target*(index+1)/size)+1)
    const index=thresholds.filter(threshold=>best>=threshold).length
    for(const side of match.competitors){const player=side.players?.[index];result[side.id]=player?{playerId:player.id,index}:undefined}
  }else if(match.modeId==='kvk组队滴血赛'){
    const initial=Math.max(1,match.modeParams.n||5)
    for(const side of match.competitors){
      const players=side.players||[],health=players.map(()=>initial)
      for(const round of completed){
        const hasDetails=players.some(player=>Object.hasOwn(round.playerScores||{},`${side.id}:${player.id}`))
        if(hasDetails){players.forEach((player,index)=>{health[index]=Math.max(0,health[index]+(round.playerScores?.[`${side.id}:${player.id}`]||0))})}
        else {let lost=Math.max(0,-(round.scores[side.id]||0));for(let index=0;index<health.length&&lost>0;index++){const removed=Math.min(health[index],lost);health[index]-=removed;lost-=removed}}
      }
      const index=health.findIndex(value=>value>0),player=players[index]
      result[side.id]=player?{playerId:player.id,index,health:health[index]}:undefined
    }
  }
  return result
}

export function bestPlayerScores(match:MatchState,playerScores:Record<string,number>){
  return Object.fromEntries(match.competitors.map(side=>[side.id,Math.max(0,...(side.players||[]).map(player=>playerScores[`${side.id}:${player.id}`]??0))]))
}

export function firstPlaceCandidates(match:MatchState,playerScores:Record<string,number>){
  const scores=bestPlayerScores(match,playerScores)
  const best=Math.max(...Object.values(scores))
  return match.competitors.filter(side=>scores[side.id]===best).map(side=>side.id)
}

function recordedFirstPlace(match:MatchState,round:MatchState['rounds'][number]):string|undefined{
  if(match.modeId.startsWith('kvk')&&match.modeId.includes('积分')&&round.playerScores&&Object.keys(round.playerScores).length){
    const candidates=firstPlaceCandidates(match,round.playerScores)
    if(candidates.length===1)return candidates[0]
    return round.firstPlaceId&&candidates.includes(round.firstPlaceId)?round.firstPlaceId:undefined
  }
  return round.firstPlaceId||(round.winnerIds?.length===1?round.winnerIds[0]:undefined)
}

export function trailingSide(match:MatchState,rounds=match.rounds):string|undefined{
  if(match.competitors.length!==2||!rounds.length)return undefined
  const [a,b]=match.competitors.map(side=>side.id)
  let diff=0,previouslyTiedLeader:string|undefined
  for(const round of rounds){
    const before=diff
    diff+=(round.scores[a]||0)-(round.scores[b]||0)
    if(diff===0&&before!==0)previouslyTiedLeader=before>0?a:b
  }
  if(diff!==0)return diff<0?a:b
  if(previouslyTiedLeader)return previouslyTiedLeader
  const last=rounds.at(-1)
  const first=last?recordedFirstPlace(match,last):undefined
  return first===a?b:first===b?a:undefined
}

export function pickAuthority(match:MatchState):string|undefined{
  const rounds=match.rounds.filter(round=>round.recorded!==false)
  if(!rounds.length)return undefined
  const last=rounds.at(-1)!
  if(match.modeId==='计时挑战赛')return '指定地图 / 随机地图'
  if(match.modeId==='1v1绝活单挑赛'){
    if(rounds.length>=2*(match.modeParams.n||1))return '决胜局随机选图'
    return `${match.competitors[rounds.length%match.competitors.length]?.name}（轮流选王图）`
  }
  if(match.modeId.startsWith('kvk')||match.modeId==='1v1单挑抢n'){
    const id=trailingSide(match,rounds)
    return id?`${match.competitors.find(side=>side.id===id)?.name}（当前落后方）`:'平分，需记录上一局第一名以确定选图方'
  }
  const total=matchScores(match,rounds)
  const remaining=match.modeId.includes('滴血')?match.competitors.filter(side=>(match.modeParams.n||5)+(total[side.id]||0)>0):match.competitors
  if(match.modeId==='多人混战滴血赛'&&remaining.length<=2){
    const id=last.ranking?.at(-1)||(last.winnerIds?.length===1?match.competitors.find(side=>side.id!==last.winnerIds![0])?.id:undefined)
    return id?`${match.competitors.find(side=>side.id===id)?.name}（上一局败方）`:'上一局败方 / 随机选图，请记录胜负'
  }
  const scoreRanking=rankRoundScores(match.competitors.map(side=>side.id),last.scores,last.ranking||[])
  let id:string|undefined
  if(match.modeId==='多人混战滴血赛')id=last.ranking?.[0]||last.firstPlaceId
  else if(match.modeId==='多人混战抢n')id=last.ranking?.[1]
  else if(match.modeId==='多人混战积分赛')id=rankRoundScores(match.competitors.map(side=>side.id),total,last.ranking||scoreRanking||[])?.[1]
  return id?`${match.competitors.find(side=>side.id===id)?.name}（选图方）`:'请记录上一局排名以确定选图方'
}

export function rankRoundScores(competitorIds:string[],scores:Record<string,number>,tieOrder:string[]=[]):string[]|null{
  if(competitorIds.some(id=>!Number.isFinite(scores[id])))return null
  const groups=new Map<number,string[]>()
  for(const id of competitorIds){const score=scores[id];groups.set(score,[...(groups.get(score)||[]),id])}
  const result:string[]=[]
  for(const [,ids] of [...groups].sort((a,b)=>b[0]-a[0])){
    if(ids.length===1){result.push(ids[0]);continue}
    const ordered=tieOrder.filter(id=>ids.includes(id))
    if(ordered.length!==ids.length||new Set(ordered).size!==ids.length)return null
    result.push(...ordered)
  }
  return result
}

export function kingTracksInFirstRoundOrder(match:MatchState):string[]{
  if(!bpFeatures(match.specialRules).king)return []
  const ranking=match.rounds[0]?.ranking
  if(!ranking||ranking.length!==match.competitors.length||new Set(ranking).size!==ranking.length||!ranking.every(id=>match.competitors.some(side=>side.id===id)))return []
  return ranking.flatMap(id=>match.specialTrackIds[`bp:${id}:king`]||[])
}

export function nextKingTrack(match:MatchState,tracks:Track[]):string|undefined{
  const used=match.rounds.map(round=>round.trackId)
  return kingTracksInFirstRoundOrder(match).find(id=>{const track=tracks.find(item=>item.id===id);return track?!trackIsAmong(track,used,tracks):!used.includes(id)})
}

export function nextFullSpeedTrack(match:MatchState):string|undefined{
  if(!match.specialRules.includes('全速对决')||match.rounds.some(round=>round.recorded===false))return undefined
  const target=match.modeParams.t||1
  if(match.rounds.length<target||match.rounds.length>=target+2)return undefined
  const base={...match,rounds:match.rounds.slice(0,target)}
  const scores=matchScores(base),values=base.competitors.map(side=>scores[side.id]||0).sort((a,b)=>b-a)
  if(values.length!==2||values[0]-values[1]>(match.specialParams.fullSpeedGap??3))return undefined
  const trailing=trailingSide(base)
  if(!trailing)return undefined
  const order=[trailing,...base.competitors.map(side=>side.id).filter(id=>id!==trailing)]
  const selected=order.map(id=>match.specialTrackIds[`fullSpeed:${id}`]?.[0])
  if(selected.every(Boolean))return selected[match.rounds.length-target]
  const legacy=match.specialTrackIds.fullSpeed||[]
  const index=base.competitors.findIndex(side=>side.id===trailing)
  return (index===0?legacy:[legacy[1],legacy[0]])[match.rounds.length-target]
}

function leaders(match:MatchState,scores:Record<string,number>){
  const best=Math.max(...match.competitors.map(side=>scores[side.id]||0))
  return match.competitors.filter(side=>(scores[side.id]||0)===best).map(side=>side.id)
}

function firstPlaceCounts(match:MatchState){
  const counts=Object.fromEntries(match.competitors.map(side=>[side.id,0]))
  for(const round of match.rounds){
    const recorded=recordedFirstPlace(match,round)
    if(recorded&&recorded in counts){counts[recorded]++;continue}
    if(round.playerScores&&Object.keys(round.playerScores).length)continue
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
