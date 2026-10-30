import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Archive, Check, Crown, Dices, Flag, ImagePlus, Plus, RotateCcw, Save, Settings2, Trash2, Trophy, X } from 'lucide-react'
import { Modal } from '../components/Modal'
import { SmartImage } from '../components/SmartImage'
import { TrackConfirmation, TrackSelector } from '../components/TrackSelector'
import { initialData } from '../data/seed'
import { activeTeamPlayers, bestPlayerScores, bpFeatures, displayModeName, evaluateGrandRound, firstPlaceCandidates, matchScores, matchTrackCandidates, nextFullSpeedTrack, nextKingTrack, normalizeBpRules, pickAuthority, poolName, rankRoundScores, trackIsAmong, tracksInPool, trailingSide } from '../matchRules'
import type { AppData, Competitor, MatchPlayer, MatchState, RoundResult, SavedMatch, Track, WheelFilter } from '../types'

const modes=['1v1单挑抢n','1v1绝活单挑赛','计时挑战赛','多人混战滴血赛','多人混战积分赛','多人混战抢n','kvk接力抢n','kvk组队滴血赛','kvk组队积分赛','kvk组队计时赛','kvk组队抢n']
const colors=['#42a5ff','#ff8a47','#9d6cff','#1ecb9b','#ef6680','#e3bd42']
const specialOptions:Record<string,string[]>={
  '1v1单挑抢n':['赛车限制','赛道BP（王图）','赛道BP（Ban 图）','鏖战','巅峰鏖战'],
  '多人混战滴血赛':['赛道BP（王图）','赛道BP（Ban 图）'],
  '多人混战积分赛':['赛道BP（王图）','赛道BP（Ban 图）','同分加赛'],
  '多人混战抢n':['赛道BP（王图）','赛道BP（Ban 图）'],
  'kvk接力抢n':['赛道BP（王图）','赛道BP（Ban 图）'],
  'kvk组队积分赛':['赛道BP（王图）','赛道BP（Ban 图）','全速对决'],
  'kvk组队抢n':['赛道BP（王图）','赛道BP（Ban 图）'],
}
const specialDescriptions:Record<string,string>={
  '赛车限制':'每位选手的赛车只能使用一次；每小局录入赛车后自动排除已使用赛车。',
  '赛道BP':'双方各选一张王图和两张禁用图；每方禁用图中最多一张五星及以上赛道。',
  '赛道BP（王图）':'每个参赛方选择一张王图，可独立开启。',
  '赛道BP（Ban 图）':'参赛方轮流各 Ban 两张地图，可独立开启；每方最多 Ban 一张五星及以上赛道。',
  '鏖战':'达到赛点平分后，必须领先两分；也可以设置封顶分数。',
  '巅峰鏖战':'鏖战触发后只能选择五星及以上赛道，并沿用领先两分与封顶规则。',
  '同分加赛':'规定局数结束仍并列时，继续比赛直到第一名唯一。',
  '全速对决':'规定局数后分差不超过阈值时，按预选的两张五星赛道加赛。',
}
const modeParamKeys:Record<string,string[]>={
  '1v1单挑抢n':['n'],'1v1绝活单挑赛':['n'],'多人混战滴血赛':['m','n'],'多人混战积分赛':['m','t'],'多人混战抢n':['m','n'],
  'kvk接力抢n':['k','n'],'kvk组队滴血赛':['k','n'],'kvk组队积分赛':['k','t'],'kvk组队计时赛':['k','n'],'kvk组队抢n':['k','n'],
}
const paramLabels:Record<string,string>={n:'目标分数 n',k:'每队人数 k',m:'参赛人数 m',t:'比赛局数 t'}

type ScorePanel='outcome'|'points'|'blood'|'time'
function scorePanel(modeId:string):ScorePanel{
  if(modeId.includes('滴血'))return 'blood'
  if(modeId.includes('积分'))return 'points'
  if(modeId.includes('计时'))return 'time'
  return 'outcome'
}
function isTeamMode(modeId:string){return modeId.startsWith('kvk')}
function rosterSize(match:MatchState){return isTeamMode(match.modeId)?Math.max(1,match.modeParams.k||2):1}
function resizeRosters(competitors:Competitor[],size:number){return competitors.map(side=>({...side,players:Array.from({length:size},(_,index)=>side.players?.[index]||{id:`${side.id}-player-${index+1}`,name:`队员 ${index+1}`})}))}
function roundPlayers(match:MatchState,side:Competitor){return (side.players||[]).map((player,index)=>({...player,name:match.useTeamNames?(isTeamMode(match.modeId)&&rosterSize(match)>1?`${side.name} ${index+1}`:side.name):player.name}))}
function roundSideName(match:MatchState,side:Competitor){return !isTeamMode(match.modeId)&&!match.useTeamNames?side.players?.[0]?.name||side.name:side.name}
function playerKey(sideId:string,player:MatchPlayer){return `${sideId}:${player.id}`}
function sequencedTeamMode(match:MatchState){return match.modeId==='kvk接力抢n'||match.modeId==='kvk组队滴血赛'}
function activeRoundPlayer(match:MatchState,side:Competitor,roundIndex:number){
  const current=match.rounds[roundIndex],active=activeTeamPlayers(match,match.rounds.slice(0,roundIndex))[side.id]
  const playerId=current?.activePlayerIds?.[side.id]||active?.playerId
  const player=roundPlayers(match,side).find(item=>item.id===playerId)
  return player?{...player,index:active?.index,health:active?.health}:undefined
}
function roundTotals(match:MatchState){return matchScores(match)}
function displaySideScore(match:MatchState,side:Competitor){
  const total=roundTotals(match)[side.id]||0
  if(scorePanel(match.modeId)==='blood')return rosterSize(match)*(match.modeParams.n||5)+total
  return total
}
function formatTime(seconds:number){if(!Number.isFinite(seconds)||seconds<=0)return '--:--.---';const minutes=Math.floor(seconds/60);return `${String(minutes).padStart(2,'0')}:${(seconds-minutes*60).toFixed(3).padStart(6,'0')}`}
function needsSpecialTrackFlow(match:MatchState){const bp=bpFeatures(match.specialRules);return bp.king||bp.ban||match.specialRules.includes('全速对决')}

function totals(match:MatchState){return roundTotals(match)}
function normalizeMatch(match:MatchState):MatchState{return {...structuredClone(initialData.match),...structuredClone(match),teamsConfigured:match.teamsConfigured??Boolean(match.configured),useTeamNames:match.useTeamNames??!match.competitors.some(side=>side.players?.length),modeParams:{...initialData.match.modeParams,...match.modeParams},specialParams:{...initialData.match.specialParams,...match.specialParams},specialRules:match.specialRules||[],specialTrackIds:match.specialTrackIds||{},specialSetupComplete:match.specialSetupComplete??Boolean(match.rounds?.length),trackPool:{...initialData.match.trackPool,...match.trackPool,noRepeat:true}}}
function scoringStructure(match:MatchState){
  return JSON.stringify({
    modeId:match.modeId,
    modeParams:match.modeParams,
    trackPool:{...match.trackPool,noRepeat:true},
    specialRules:normalizeBpRules(match.specialRules).sort(),
    specialParams:match.specialParams,
    specialTrackIds:match.specialTrackIds,
    useTeamNames:match.useTeamNames,
    competitors:match.competitors.map(side=>({id:side.id,players:side.players?.map(player=>({id:player.id,name:player.name}))||[]})),
  })
}

export function MatchPage({ data, update }: { data: AppData; update: (fn: (d: AppData) => AppData) => void }) {
  const match=data.match
  const [settings,setSettings]=useState(false),[picking,setPicking]=useState(false),[editingRound,setEditingRound]=useState<RoundResult|null>(null),[archives,setArchives]=useState(false),[resetArmed,setResetArmed]=useState(false)
  const [scrollVersion,setScrollVersion]=useState(0)
  const roundScrollRef=useRef<HTMLDivElement>(null)
  useLayoutEffect(()=>{const element=roundScrollRef.current;if(element&&scrollVersion>0)element.scrollLeft=element.scrollWidth},[scrollVersion,match.rounds.length])
  const evaluation=useMemo(()=>evaluateGrandRound({...match,rounds:match.rounds.filter(round=>round.recorded!==false)}),[match])
  const lastRound=match.rounds.at(-1)
  const pendingRound=lastRound?.recorded===false?lastRound:undefined
  const hasBp=bpFeatures(match.specialRules).king
  const missingFirstRanking=hasBp&&match.rounds.length>0&&!match.rounds[0].ranking
  const patch=(value:Partial<MatchState>)=>update(d=>({...d,match:{...d.match,...value}}))
  function addRound(trackId:string){const round:RoundResult={id:`round-${Date.now()}`,trackId,scores:Object.fromEntries(match.competitors.map(x=>[x.id,0])),notes:'',recorded:false};patch({rounds:[...match.rounds,round],activeRound:match.rounds.length});setPicking(false);setEditingRound(round)}
  function updateRound(round:RoundResult):string|undefined{
    const next={...match,rounds:match.rounds.map(item=>item.id===round.id?{...round,recorded:true}:item)}
    const changedIndex=match.rounds.findIndex(item=>item.id===round.id)
    if(sequencedTeamMode(match)){
      for(let index=changedIndex+1;index<match.rounds.length;index++){
        if(match.rounds[index].recorded===false)continue
        const before=activeTeamPlayers(match,match.rounds.slice(0,index)),after=activeTeamPlayers(next,next.rounds.slice(0,index))
        if(match.competitors.some(side=>before[side.id]?.playerId!==after[side.id]?.playerId))return '修改会改变后续已记录小局的上场选手。请保留原成绩，或重新开始本大局后按正确顺序录入。'
      }
    }
    setScrollVersion(value=>value+1)
    const result=evaluateGrandRound({...next,rounds:next.rounds.filter(item=>item.recorded!==false)})
    if(result.finished&&next.rounds.every(item=>item.recorded!==false)){
      const finalScores=matchScores(next)
      patch({competitors:next.competitors.map(side=>({...side,grandScore:side.grandScore+(result.winnerIds.includes(side.id)?1:0),score:0})),completedGrandRounds:[...next.completedGrandRounds,{id:`grand-${Date.now()}`,modeId:next.modeId,modeParams:structuredClone(next.modeParams),specialRules:next.specialRules,trackPool:structuredClone(next.trackPool),specialParams:structuredClone(next.specialParams),specialTrackIds:structuredClone(next.specialTrackIds),competitors:structuredClone(next.competitors),useTeamNames:next.useTeamNames,rounds:structuredClone(next.rounds),finalScores,winnerIds:result.winnerIds,completedAt:new Date().toISOString()}],configured:false,specialTrackIds:{},specialSetupComplete:!needsSpecialTrackFlow(next),rounds:[],activeRound:0})
      setEditingRound(null);setSettings(false);return
    }
    const isLatest=next.rounds.at(-1)?.id===round.id
    const nextTrack=isLatest?(nextFullSpeedTrack(next)||nextKingTrack(next,data.tracks)):undefined
    if(nextTrack){const upcoming:RoundResult={id:`round-${Date.now()}-${next.rounds.length}`,trackId:nextTrack,scores:Object.fromEntries(next.competitors.map(side=>[side.id,0])),notes:'',recorded:false};patch({rounds:[...next.rounds,upcoming],activeRound:next.rounds.length});setEditingRound(null);return}
    patch({rounds:next.rounds});setEditingRound(null)
  }
  function forcedNextTrack(){
    return nextFullSpeedTrack(match)
  }
  function chooseNextTrack(){if(pendingRound){setEditingRound(pendingRound);return}if(missingFirstRanking){setEditingRound(match.rounds[0]);return}const forced=forcedNextTrack();if(forced){addRound(forced);return}const king=nextKingTrack(match,data.tracks);if(king){addRound(king);return}const target=match.modeParams.t||1,base={...match,rounds:match.rounds.slice(0,target)};if(match.specialRules.includes('全速对决')&&match.rounds.length>=target&&evaluateGrandRound(base).phase==='overtime'&&!trailingSide(base)){setEditingRound(base.rounds.at(-1)||null);return}setPicking(true)}
  function saveArchive(){if(!match.rounds.length)return;const archive:SavedMatch={id:`archive-${Date.now()}`,name:`${displayModeName(match.modeId,match.modeParams)} · ${new Date().toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}`,savedAt:new Date().toISOString(),match:structuredClone(match)};update(d=>({...d,matchArchives:[archive,...d.matchArchives]}))}
  function restart(){update(d=>({...d,match:structuredClone(initialData.match)}));setSettings(false);setPicking(false);setEditingRound(null);setResetArmed(false)}
  function applySettings(next:MatchState){const reset=scoringStructure(next)!==scoringStructure(match),flow=needsSpecialTrackFlow(next);patch({...next,configured:true,specialTrackIds:reset?{}:next.specialTrackIds,specialSetupComplete:flow?(reset?false:match.specialSetupComplete):true,rounds:reset?[]:match.rounds,activeRound:reset?0:match.activeRound});setSettings(false)}
  if(!match.teamsConfigured)return <TeamSetupScreen match={match} onConfirm={competitors=>patch({competitors,teamsConfigured:true})}/>
  if(!match.configured) return <MatchSetupScreen data={data} match={match} onConfirm={next=>patch({...next,configured:true,specialTrackIds:{},specialSetupComplete:!needsSpecialTrackFlow(next),rounds:[],activeRound:0})}/>
  if(needsSpecialTrackFlow(match)&&!match.specialSetupComplete)return <><SpecialSetupFlow data={data} match={match} onPatch={patch} onEdit={()=>setSettings(true)}/>{settings&&<MatchSettings data={data} match={match} onSave={applySettings} onClose={()=>setSettings(false)}/>}</>
  return <div className="match-page page-enter">
    <div className="match-topbar panel"><div className="match-heading"><span className="eyebrow">第 {match.completedGrandRounds.length+1} 大局</span><div className="match-primary-actions"><span className={`auto-grand-state ${evaluation.phase}`}>{evaluation.reason}</span><button className="btn primary" onClick={chooseNextTrack}><Plus size={17}/> {pendingRound?'录入当前小局':missingFirstRanking?'补录首局排名':forcedNextTrack()?'开始全速对决赛道':'添加小局'}</button></div></div>
      {match.competitors.length===2?<DuelScoreboard match={match}/>:<><div className="multi-mode"><strong>{displayModeName(match.modeId,match.modeParams)}</strong>{match.specialRules.length>0&&<div className="active-specials">{match.specialRules.map(rule=><span key={rule}>{rule}</span>)}</div>}</div><div className={`scoreboard competitors-${match.competitors.length}`}>{match.competitors.map(team=><div className="team-score" key={team.id} style={{'--team-color':team.color} as React.CSSProperties}><Avatar competitor={team}/><div className="team-label"><strong>{team.name}</strong>{!match.useTeamNames&&isTeamMode(match.modeId)&&scorePanel(match.modeId)==='points'?<PlayerTotals match={match} side={team}/>:null}{match.showGrandScore&&<small>大分 {team.grandScore}</small>}</div><div className="computed-score"><small>{scorePanel(match.modeId)==='blood'?'剩余血量':'当前小分'}</small><strong>{displaySideScore(match,team)}</strong></div></div>)}</div></>}
      <div className="match-tools"><button onClick={()=>setSettings(true)}><Settings2 size={14}/> 修改本大局</button><button disabled={!match.rounds.length} onClick={saveArchive}><Save size={14}/> 保存战绩</button><button onClick={()=>setArchives(true)}><Archive size={14}/> 战绩库（{data.matchArchives.length}）</button><span/><button className={resetArmed?'reset-confirm':''} onClick={()=>resetArmed?restart():setResetArmed(true)}><RotateCcw size={14}/>{resetArmed?'确认清空并重新开始':'重新开始比赛'}</button>{resetArmed&&<button onClick={()=>setResetArmed(false)}>取消</button>}</div>
    </div>
    <MatchRuleContext data={data} match={match} evaluation={evaluation}/>
    
    {match.completedGrandRounds.length>0&&<div className="grand-history">{match.completedGrandRounds.map((grand,index)=><div key={grand.id}><span>第 {index+1} 大局</span><strong>{displayModeName(grand.modeId,grand.modeParams||{})}</strong><small>{match.competitors.map(c=>`${c.name} ${grand.finalScores[c.id]||0}`).join(' : ')}</small></div>)}</div>}
    <div className="rounds-header"><div><span className="eyebrow">SMALL ROUNDS</span><h2>当前大局 · 小局战绩</h2></div><p>共 {match.rounds.length} 小局</p></div>
    {match.rounds.length>0&&<div className="round-scroll" ref={roundScrollRef}>{match.rounds.map((round,index)=>{const track=data.tracks.find(x=>x.id===round.trackId);return <button className={`round-card ${match.activeRound===index?'active':''}`} key={round.id} onClick={()=>{patch({activeRound:index});setEditingRound(round)}}><div className="round-image"><SmartImage src={track?.coverVertical||track?.coverHorizontal}/><span className="round-number">小局 {String(index+1).padStart(2,'0')}</span><div className="round-overlay"><span>{track?.star||0} ★</span><strong>{track?.name||'未知赛道'}</strong></div></div>{round.recorded===false?<div className="round-awaiting">待录入本局成绩{(sequencedTeamMode(match)||match.modeId==='多人混战滴血赛')&&match.competitors.map(side=><span className="pending-player" key={side.id}>{side.name}：{sequencedTeamMode(match)?activeRoundPlayer(match,side,index)?.name||'已淘汰':roundSideName(match,side)}</span>)}</div>:<RoundScoreSummary match={match} round={round} roundIndex={index}/>}</button>})}{!pendingRound&&<button className="round-add" onClick={chooseNextTrack}><span><Plus/></span><strong>{missingFirstRanking?'补录首局排名':forcedNextTrack()?'开始预选加赛':'添加下一小局'}</strong></button>}</div>}
    {!match.rounds.length&&<div className="match-empty"><div className="flag-orbit"><Flag/></div><h2>本大局还没有小局</h2><button className="btn primary" onClick={chooseNextTrack}><Dices size={17}/> 添加第一小局</button></div>}
    {settings&&<MatchSettings data={data} match={match} onSave={applySettings} onClose={()=>setSettings(false)}/>}
    {picking&&<TrackPicker data={data} match={match} onPick={addRound} onClose={()=>setPicking(false)}/>} {editingRound&&<RoundEditor data={data} round={editingRound} match={match} save={updateRound} onClose={()=>setEditingRound(null)}/>}
    {archives&&<ArchiveModal archives={data.matchArchives} onRestore={saved=>{update(d=>({...d,match:normalizeMatch(saved.match)}));setArchives(false)}} onDelete={id=>update(d=>({...d,matchArchives:d.matchArchives.filter(x=>x.id!==id)}))} onClose={()=>setArchives(false)}/>}
  </div>
}

function MatchRuleContext({data,match,evaluation}:{data:AppData;match:MatchState;evaluation:ReturnType<typeof evaluateGrandRound>}){
  const poolTracks=tracksInPool(data.tracks,match.trackPool)
  return <div className="match-rule-context"><div className="active-pool"><Dices size={18}/><span><small>本大局地图池</small><strong>{poolName(match.trackPool)}</strong></span><b>{poolTracks.length} 张</b></div><div className={`grand-evaluation ${evaluation.phase}`}><Flag size={17}/><span><small>自动结算</small><strong>{evaluation.reason}</strong></span></div>{match.specialRules.map(rule=><div className="active-special-rule" key={rule}><Crown size={16}/><span><small>特殊玩法</small><strong>{rule}</strong></span></div>)}</div>
}

function SpecialSetupFlow({data,match,onPatch,onEdit}:{data:AppData;match:MatchState;onPatch:(value:Partial<MatchState>)=>void;onEdit:()=>void}){
  const [blindReady,setBlindReady]=useState('')
  const [randomTrack,setRandomTrack]=useState<Track|null>(null)
  const pool=tracksInPool(data.tracks,match.trackPool)
  const selected=match.specialTrackIds
  const firstId=selected.firstTrack?.[0]
  const {king:hasKing,ban:hasBan}=bpFeatures(match.specialRules)
  const kingSide=hasKing?match.competitors.find(side=>(selected[`bp:${side.id}:king`]?.length||0)<1):undefined
  const banTurns=hasBan?[0,1].flatMap(round=>match.competitors.map(side=>({side,round}))):[]
  const banTurn=banTurns.find(({side,round})=>(selected[`bp:${side.id}:ban`]?.length||0)<=round)
  const blindSide=match.specialRules.includes('全速对决')?match.competitors.find(side=>(selected[`fullSpeed:${side.id}`]?.length||0)<1):undefined
  const kings=hasKing?match.competitors.flatMap(side=>selected[`bp:${side.id}:king`]||[]):[]
  const bans=hasBan?match.competitors.flatMap(side=>selected[`bp:${side.id}:ban`]||[]):[]
  const blindIds=match.competitors.flatMap(side=>selected[`fullSpeed:${side.id}`]||[])
  const allDone=Boolean(firstId)&&!kingSide&&!banTurn&&!blindSide
  const duplicateBlind=blindIds.some((id,index)=>{const track=data.tracks.find(item=>item.id===id);return track?trackIsAmong(track,blindIds.slice(0,index),data.tracks):blindIds.slice(0,index).includes(id)})
  const trackName=(id?:string)=>data.tracks.find(track=>track.id===id)?.name||'尚未选择'
  const setSelection=(key:string,ids:string[])=>onPatch({specialTrackIds:{...selected,[key]:ids}})
  const step=!firstId?'first':kingSide?'king':banTurn?'ban':blindSide?'blind':'confirm'
  const stages=[{id:'first',label:'首图'},...(hasKing?[{id:'king',label:'双方王图'}]:[]),...(hasBan?[{id:'ban',label:'轮流 Ban 图'}]:[]),...(match.specialRules.includes('全速对决')?[{id:'blind',label:'全速盲选'}]:[]),{id:'confirm',label:'确认'}]
  const stepIndex=Math.max(0,stages.findIndex(item=>item.id===step))
  function complete(){
    if(!firstId||duplicateBlind)return
    const round:RoundResult={id:`round-${Date.now()}`,trackId:firstId,scores:Object.fromEntries(match.competitors.map(side=>[side.id,0])),notes:'',recorded:false}
    onPatch({specialSetupComplete:true,rounds:[round],activeRound:0})
  }
  function resetBlind(){const next={...selected};Object.keys(next).filter(key=>key.startsWith('fullSpeed:')||key==='fullSpeed').forEach(key=>delete next[key]);onPatch({specialTrackIds:next});setBlindReady('')}
  if(step==='blind'&&blindSide&&blindReady!==blindSide.id)return <div className="special-flow-page page-enter"><div className="special-handoff panel"><span className="handoff-icon" style={{background:blindSide.color}}>{blindSide.name.slice(0,1)}</span><span className="eyebrow">BLIND PICK · 全速对决</span><h1>请将设备交给 {blindSide.name}</h1><p>另一方选择的赛道不会显示。确认周围无人查看后再开始盲选。</p><button className="btn primary" onClick={()=>setBlindReady(blindSide.id)}>开始 {blindSide.name} 的盲选</button></div></div>
  if(allDone)return <div className="special-flow-page page-enter"><SpecialFlowHeader match={match} stages={stages} stepIndex={stepIndex} onEdit={onEdit}/><div className="special-reveal panel"><span className="eyebrow">PRE-MATCH READY</span><h1>{duplicateBlind?'双方选中了同一张全速赛道':'赛前选图完成'}</h1><p>{duplicateBlind?'为保持盲选公平，两方需要重新进行全速对决盲选。':'确认下列地图后进入计分台；首图会自动创建为第一小局。'}</p><div className="special-reveal-grid"><SpecialTrackResult label="首图" ids={[firstId!]} data={data}/>{hasKing&&<SpecialTrackResult label="王图" ids={kings} data={data}/>} {hasBan&&<SpecialTrackResult label="Ban 图" ids={bans} data={data}/>} {match.specialRules.includes('全速对决')&&<SpecialTrackResult label="全速对决盲选" ids={blindIds} data={data} sides={match.competitors}/>}</div>{duplicateBlind?<button className="btn primary" onClick={resetBlind}>重新进行双方盲选</button>:<button className="btn primary" onClick={complete}><Check size={17}/> 确认并进入比赛</button>}</div></div>
  let title='选择本大局首图',description='首图确定后再进行王图、Ban 图和全速对决预选。',candidates=pool,selectedIds:string[]=[]
  if(step==='king'&&kingSide){title=`${kingSide.name} 选择王图`;description='从本大局地图池中指定一张王图，不需要提前在仓库点亮皇冠。';const used=[firstId,...kings,...bans].filter((id):id is string=>Boolean(id));candidates=pool.filter(track=>!trackIsAmong(track,used,data.tracks));selectedIds=selected[`bp:${kingSide.id}:king`]||[]}
  if(step==='ban'&&banTurn){const key=`bp:${banTurn.side.id}:ban`,own=selected[key]||[],used=[firstId,...kings,...bans].filter((id):id is string=>Boolean(id)),hasHigh=own.some(id=>(data.tracks.find(track=>track.id===id)?.star||0)>=5);title=`${banTurn.side.name} · 第 ${banTurn.round+1} 次 Ban 图`;description='双方交替各 Ban 两张地图；每方最多 Ban 一张五星及以上地图。';candidates=pool.filter(track=>!trackIsAmong(track,used,data.tracks)&&(!hasHigh||track.star<5));selectedIds=own}
  if(step==='blind'&&blindSide){const excluded=[...kings,...bans];title=`${blindSide.name} 盲选全速对决赛道`;description='只能选择五星及以上地图，且不可以是双方王图或 Ban 图。另一方的盲选结果会在双方完成后统一揭示。';candidates=pool.filter(track=>track.star>=5&&!trackIsAmong(track,excluded,data.tracks));selectedIds=selected[`fullSpeed:${blindSide.id}`]||[]}
  function choose(track:Track){
    if(step==='first'){setSelection('firstTrack',[track.id]);return}
    if(step==='king'&&kingSide){setSelection(`bp:${kingSide.id}:king`,[track.id]);return}
    if(step==='ban'&&banTurn){const key=`bp:${banTurn.side.id}:ban`;setSelection(key,[...(selected[key]||[]),track.id]);return}
    if(step==='blind'&&blindSide){setSelection(`fullSpeed:${blindSide.id}`,[track.id]);setBlindReady('')}
  }
  const random=()=>{if(candidates.length)setRandomTrack(candidates[Math.floor(Math.random()*candidates.length)])}
  return <div className="special-flow-page page-enter"><SpecialFlowHeader match={match} stages={stages} stepIndex={stepIndex} onEdit={onEdit}/><div className="special-flow-workspace"><aside className="panel special-flow-summary"><span className="eyebrow">已完成选择</span><SpecialTrackResult label="首图" ids={firstId?[firstId]:[]} data={data}/>{hasKing&&match.competitors.map(side=><SpecialTrackResult key={`king-${side.id}`} label={`${side.name}王图`} ids={selected[`bp:${side.id}:king`]||[]} data={data}/>)}{hasBan&&match.competitors.map(side=><SpecialTrackResult key={`ban-${side.id}`} label={`${side.name} Ban`} ids={selected[`bp:${side.id}:ban`]||[]} data={data}/>)}</aside><main className="panel special-flow-picker"><div className="special-flow-title"><div><span className="eyebrow">STEP {stepIndex+1}</span><h1>{title}</h1><p>{description}</p></div>{step==='first'&&<button className="btn ghost" disabled={!candidates.length} onClick={random}><Dices size={16}/> 随机首图</button>}</div><TrackSelector key={`${step}-${kingSide?.id||banTurn?.side.id||blindSide?.id||''}-${banTurn?.round||0}`} tracks={candidates} selectedIds={selectedIds} onSelect={choose}/>{randomTrack&&<TrackConfirmation track={randomTrack} onCancel={()=>setRandomTrack(null)} onConfirm={()=>{choose(randomTrack);setRandomTrack(null)}}/>}</main></div></div>
}

function SpecialFlowHeader({match,stages,stepIndex,onEdit}:{match:MatchState;stages:{id:string;label:string}[];stepIndex:number;onEdit:()=>void}){return <><div className="special-flow-head"><div><span className="eyebrow">第 {match.completedGrandRounds.length+1} 大局 · 赛前流程</span><h1>{displayModeName(match.modeId,match.modeParams)}</h1><p>{poolName(match.trackPool)}</p></div><button className="btn ghost" onClick={onEdit}><Settings2 size={16}/> 修改大局设置</button></div><div className="special-flow-steps">{stages.map((stage,index)=><div className={index<stepIndex?'done':index===stepIndex?'active':''} key={stage.id}><b>{index<stepIndex?<Check size={13}/>:index+1}</b><span>{stage.label}</span></div>)}</div></>}

function SpecialTrackResult({label,ids,data,sides}:{label:string;ids:string[];data:AppData;sides?:Competitor[]}){return <div className="special-result-group"><small>{label}</small>{ids.length?<div>{ids.map((id,index)=><span key={`${id}-${index}`}><strong>{sides?.[index]?.name&&`${sides[index].name} · `}{data.tracks.find(track=>track.id===id)?.name||'未知地图'}</strong></span>)}</div>:<em>待选择</em>}</div>}

function DuelScoreboard({match}:{match:MatchState}){
  const [left,right]=match.competitors
  const kind=scorePanel(match.modeId)
  const scoreLabel=kind==='blood'?'剩余血量':'小分'
  const side=(competitor:Competitor,position:'left'|'right')=><div className={`duel-side ${position}`} style={{'--team-color':competitor.color} as React.CSSProperties}>
    {position==='left'&&match.showGrandScore&&<div className="duel-grand"><strong>{competitor.grandScore}</strong><span>大分</span></div>}
    {position==='right'&&<div className="duel-small"><span>{scoreLabel}</span><strong>{displaySideScore(match,competitor)}</strong></div>}
    <Avatar competitor={competitor}/><div className="duel-name"><strong>{competitor.name}</strong>{!match.useTeamNames&&competitor.players?.length?(kind==='points'&&isTeamMode(match.modeId)?<PlayerTotals match={match} side={competitor}/>:<small>{roundPlayers(match,competitor).map(p=>p.name).join(' / ')}</small>):null}</div>
    {position==='left'&&<div className="duel-small"><span>{scoreLabel}</span><strong>{displaySideScore(match,competitor)}</strong></div>}
    {position==='right'&&match.showGrandScore&&<div className="duel-grand"><strong>{competitor.grandScore}</strong><span>大分</span></div>}
  </div>
  return <div className="duel-scoreboard">{side(left,'left')}<div className="duel-mode"><span>当前模式</span><strong>{displayModeName(match.modeId,match.modeParams)}</strong>{match.specialRules.length>0&&<div className="active-specials">{match.specialRules.map(rule=><span key={rule}>{rule}</span>)}</div>}</div>{side(right,'right')}</div>
}

function PlayerTotals({match,side}:{match:MatchState;side:Competitor}){
  return <div className="player-totals">{roundPlayers(match,side).map(player=><span key={player.id}><span>{player.name}</span><strong>{match.rounds.reduce((sum,round)=>sum+(round.recorded===false?0:round.playerScores?.[playerKey(side.id,player)]||0),0)}</strong></span>)}</div>
}

function RoundScoreSummary({match,round,roundIndex}:{match:MatchState;round:RoundResult;roundIndex:number}){
  const kind=scorePanel(match.modeId)
  const through=match.rounds.slice(0,roundIndex+1)
  return <div className={`round-scores score-${kind}`}>{match.competitors.map(side=>{
    const value=round.scores[side.id]||0
    const cumulative=through.reduce((sum,item)=>sum+(item.scores[side.id]||0),0)
    const active=sequencedTeamMode(match)?activeRoundPlayer(match,side,roundIndex):undefined
    const players=sequencedTeamMode(match)?(active?[active]:[]):isTeamMode(match.modeId)?roundPlayers(match,side):[]
    const currentTime=players.length?players.reduce((sum,p)=>sum+(round.playerTimes?.[playerKey(side.id,p)]||0),0):(round.playerTimes?.[side.id]||0)
    const remaining=rosterSize(match)*(match.modeParams.n||5)+cumulative
    return <div className="round-side-summary" key={side.id}><span><i style={{background:side.color}}/>{roundSideName(match,side)}</span><span className="round-points">
      {kind==='outcome'&&<><strong className={round.winnerIds?.includes(side.id)?'positive':''}>{round.winnerIds?.includes(side.id)?'胜':'负'}</strong><small>小分 {cumulative}</small></>}
      {kind==='points'&&<><strong className={value>0?'positive':''}>{value>0?'+':''}{value}</strong><small>累计 {cumulative}</small></>}
      {kind==='blood'&&<><strong className="negative">{value||0}</strong><small>剩余 {remaining}</small></>}
      {kind==='time'&&<><strong>{formatTime(currentTime)}</strong><small>胜场 {cumulative}</small></>}
    </span>{players.length>0&&<div className="round-player-lines">{players.map(player=>{const key=playerKey(side.id,player);const playerValue=round.playerScores?.[key]||0;const deduction=Object.hasOwn(round.playerScores||{},key)?playerValue:round.scores[side.id]||0;const playerRemaining=active?.health!==undefined?active.health+deduction:(match.modeParams.n||5)+through.reduce((sum,item)=>sum+(item.playerScores?.[key]||0),0);return <small key={player.id}><b>{player.name}</b>{kind==='time'?formatTime(round.playerTimes?.[key]||0):kind==='blood'?`剩余 ${Math.max(0,playerRemaining)}`:sequencedTeamMode(match)?'本局上场':`${playerValue>0?'+':''}${playerValue}`}</small>})}</div>}</div>
  })}</div>
}

function Avatar({competitor}:{competitor:Competitor}){return competitor.avatar?<SmartImage className="team-avatar" src={competitor.avatar}/>:<span className="team-avatar fallback" style={{background:competitor.color}}>{competitor.name.slice(0,1)}</span>}
function TeamSetupScreen({match,onConfirm}:{match:MatchState;onConfirm:(competitors:Competitor[])=>void}){
  const [teams,setTeams]=useState(()=>structuredClone(match.competitors))
  const change=(id:string,value:Partial<Competitor>)=>setTeams(current=>current.map(side=>side.id===id?{...side,...value}:side))
  const upload=(id:string,file?:File)=>{if(!file)return;const reader=new FileReader();reader.onload=()=>change(id,{avatar:String(reader.result)});reader.readAsDataURL(file)}
  function add(){const id=`side-${Date.now()}`;setTeams(current=>[...current,{id,name:`队伍 ${current.length+1}`,grandScore:0,score:0,color:colors[current.length%colors.length]}])}
  return <div className="match-setup-screen page-enter"><div className="setup-intro"><span className="setup-mark"><Trophy/></span><span className="eyebrow">NEW MATCH · 1 / 2</span><h1>先确定参赛队伍</h1></div><div className="panel setup-panel"><div className="form-row-title"><div><strong>参赛队伍</strong><span>至少两队，最多六队；可上传队徽或头像</span></div><button type="button" className="btn small ghost" disabled={teams.length>=6} onClick={add}><Plus size={14}/> 添加队伍</button></div><div className="competitor-cards">{teams.map((side,index)=><div className="competitor-card" key={side.id}><label className="avatar-upload">{side.avatar?<SmartImage src={side.avatar}/>:<><ImagePlus/><span>队徽 / 头像</span></>}<input type="file" accept="image/*" onChange={e=>upload(side.id,e.target.files?.[0])}/></label><div className="competitor-fields"><label>队伍名称<input value={side.name} onChange={e=>change(side.id,{name:e.target.value})}/></label><label>识别色<div className="color-input"><input type="color" value={side.color} onChange={e=>change(side.id,{color:e.target.value})}/><span>{side.color}</span></div></label></div><button type="button" className="icon-btn remove-competitor" disabled={teams.length<=2} onClick={()=>setTeams(current=>current.filter(item=>item.id!==side.id))}><X size={16}/></button><span className="competitor-index">{String(index+1).padStart(2,'0')}</span></div>)}</div><button type="button" className="btn primary confirm-match" disabled={teams.length<2||teams.some(side=>!side.name.trim())} onClick={()=>onConfirm(teams.map(side=>({...side,name:side.name.trim()})))}>下一步：设置第 1 大局</button></div></div>
}
function MatchSetupScreen({data,match,onConfirm}:{data:AppData;match:MatchState;onConfirm:(m:MatchState)=>void}){return <div className="match-setup-screen page-enter"><div className="setup-intro"><span className="setup-mark"><Trophy/></span><span className="eyebrow">GRAND ROUND SETUP</span><h1>设置第 {match.completedGrandRounds.length+1} 大局</h1></div><div className="panel setup-panel"><MatchEditor data={data} match={match} onConfirm={onConfirm}/></div></div>}
function MatchSettings({data,match,onSave,onClose}:{data:AppData;match:MatchState;onSave:(m:MatchState)=>void;onClose:()=>void}){return <Modal title="大局设置" onClose={onClose} wide><MatchEditor data={data} match={match} onConfirm={onSave}/></Modal>}

function MatchEditor({data,match,onConfirm}:{data:AppData;match:MatchState;onConfirm:(m:MatchState)=>void}){
  const [draft,setDraft]=useState<MatchState>(()=>{const copy=structuredClone(match);copy.specialRules=normalizeBpRules(copy.specialRules);copy.competitors=resizeRosters(copy.competitors,rosterSize(copy));return copy})
  const patchPlayer=(sideId:string,playerId:string,name:string)=>setDraft({...draft,competitors:draft.competitors.map(side=>side.id===sideId?{...side,players:side.players?.map(player=>player.id===playerId?{...player,name}:player)}:side)})
  const options=[...(specialOptions[draft.modeId]||[])];if(!draft.modeId.includes('计时')&&!options.includes('赛车限制'))options.unshift('赛车限制')
  const toggleSpecial=(option:string)=>setDraft(current=>{
    if(current.specialRules.includes(option)){
      const specialTrackIds={...current.specialTrackIds}
      if(option==='赛道BP（王图）')Object.keys(specialTrackIds).filter(key=>key.startsWith('bp:')&&key.endsWith(':king')).forEach(key=>delete specialTrackIds[key])
      if(option==='赛道BP（Ban 图）')Object.keys(specialTrackIds).filter(key=>key.startsWith('bp:')&&key.endsWith(':ban')).forEach(key=>delete specialTrackIds[key])
      if(option==='全速对决')Object.keys(specialTrackIds).filter(key=>key==='fullSpeed'||key.startsWith('fullSpeed:')).forEach(key=>delete specialTrackIds[key])
      return {...current,specialRules:current.specialRules.filter(x=>x!==option),specialTrackIds}
    }
    const group=option.startsWith('首图：')?'首图：':option.startsWith('选图：')?'选图：':['鏖战','巅峰鏖战'].includes(option)?'决胜规则':''
    const remaining=group?current.specialRules.filter(x=>group==='决胜规则'?!['鏖战','巅峰鏖战'].includes(x):!x.startsWith(group)):current.specialRules
    return {...current,specialRules:[...remaining,option]}
  })
  const params=modeParamKeys[draft.modeId]||[]
  const invalid=draft.competitors.length<2||draft.competitors.some(side=>!side.name.trim()||(!draft.useTeamNames&&(!side.players?.length||side.players.some(player=>!player.name.trim()))))||!draft.trackPool.stars.length||(draft.trackPool.base==='custom'&&!draft.trackPool.customTrackIds.length)
  return <div className="match-editor">
    <div className="setup-options"><label>玩法<select value={draft.modeId} onChange={e=>{const modeId=e.target.value;setDraft(current=>({...current,modeId,specialRules:[],specialTrackIds:{},competitors:resizeRosters(current.competitors,isTeamMode(modeId)?current.modeParams.k||2:1)}))}}>{modes.map(x=><option key={x}>{x}</option>)}</select></label><label className="display-grand"><span><strong>显示大分</strong></span><button type="button" className={`switch ${draft.showGrandScore?'on':''}`} onClick={()=>setDraft({...draft,showGrandScore:!draft.showGrandScore})}><span/></button></label></div>
    {params.length>0&&<div className="mode-params"><div><strong>玩法参数</strong><span>填写本玩法需要的数值</span></div><div>{params.map(key=><label key={key}>{paramLabels[key]}<input type="number" min="1" value={draft.modeParams[key]||1} onChange={e=>{const value=Math.max(1,Number(e.target.value)||1);setDraft(current=>({...current,modeParams:{...current.modeParams,[key]:value},competitors:key==='k'?resizeRosters(current.competitors,value):current.competitors}))}}/></label>)}</div></div>}
    <MatchPoolEditor tracks={data.tracks} filter={draft.trackPool} onChange={trackPool=>setDraft({...draft,trackPool})}/>
    {options.length>0&&<section className="special-rules-editor"><div className="form-row-title"><div><strong>特殊玩法</strong></div></div><div className="special-rule-cards">{options.map(option=><button type="button" key={option} className={draft.specialRules.includes(option)?'active':''} onClick={()=>toggleSpecial(option)}><span>{draft.specialRules.includes(option)&&<Check size={14}/>}</span><strong>{option}</strong><small>{specialDescriptions[option]}</small></button>)}</div>{(draft.specialRules.includes('鏖战')||draft.specialRules.includes('巅峰鏖战'))&&<label className="special-number">鏖战封顶分数<input type="number" min={draft.modeParams.n||1} value={draft.specialParams.overtimeCap||((draft.modeParams.n||1)+3)} onChange={e=>setDraft({...draft,specialParams:{...draft.specialParams,overtimeCap:Math.max(draft.modeParams.n||1,Number(e.target.value)||1)}})}/></label>}{draft.specialRules.includes('全速对决')&&<label className="special-number">触发最大分差 h<input type="number" min="0" value={draft.specialParams.fullSpeedGap??3} onChange={e=>setDraft({...draft,specialParams:{...draft.specialParams,fullSpeedGap:Math.max(0,Number(e.target.value)||0)}})}/></label>}</section>}
    <div className="form-row-title"><div><strong>本大局参赛名称</strong><span>{sequencedTeamMode(draft)?"队伍和大分保持不变；选手填写顺序即出场顺序":"队伍和大分保持不变，每大局可调整上场选手"}</span></div></div><div className="participant-name-options"><button type="button" className={draft.useTeamNames?'active':''} onClick={()=>setDraft({...draft,useTeamNames:true})}>直接使用队伍名称</button><button type="button" className={!draft.useTeamNames?'active':''} onClick={()=>setDraft({...draft,useTeamNames:false})}>设置本大局选手名称</button></div><div className="round-participant-list">{draft.competitors.map(c=><div key={c.id} className="round-participant"><Avatar competitor={c}/><div><strong>{c.name}</strong>{draft.useTeamNames?<small>{isTeamMode(draft.modeId)&&rosterSize(draft)>1?`队员按 ${c.name} 1、${c.name} 2 等显示`: '直接使用队伍名称'}</small>:<div className="round-player-inputs">{c.players?.map((player,index)=><label key={player.id}><span>{isTeamMode(draft.modeId)?`选手 ${index+1}`:'选手名称'}</span><input value={player.name} onChange={e=>patchPlayer(c.id,player.id,e.target.value)} placeholder="输入选手名称"/></label>)}</div>}</div></div>)}</div>
    <button className="btn primary confirm-match" disabled={invalid} onClick={()=>onConfirm(draft)}><Check size={16}/> {needsSpecialTrackFlow(draft)?'进入赛前选图流程':`开始第 ${draft.completedGrandRounds.length+1} 大局`}</button>
  </div>
}

function MatchPoolEditor({tracks,filter,onChange}:{tracks:Track[];filter:WheelFilter;onChange:(filter:WheelFilter)=>void}){
  const count=tracksInPool(tracks,filter).length
  const toggleStar=(star:number)=>onChange({...filter,stars:filter.stars.includes(star)?filter.stars.filter(value=>value!==star):[...filter.stars,star].sort()})
  return <section className="match-pool-editor"><div className="form-row-title"><div><strong>本大局地图池</strong></div><b>{count} 张</b></div><div className="match-pool-bases">{([['all','全图池'],['peak','巅峰赛'],['league','联赛'],['item','道具'],['custom','自定义']] as const).map(([value,label])=><button type="button" key={value} className={filter.base===value?'active':''} onClick={()=>onChange({...filter,base:value})}>{label}</button>)}</div><div className="match-star-filter"><span>星级</span>{[1,2,3,4,5,6,7].map(star=><button type="button" key={star} className={filter.stars.includes(star)?'active':''} onClick={()=>toggleStar(star)}>{star}★</button>)}</div><div className="match-pool-switches"><button type="button" className={filter.excludeSailing?'active':''} onClick={()=>onChange({...filter,excludeSailing:!filter.excludeSailing})}>排除航海赛道</button><button type="button" className={filter.excludeNostalgia?'active':''} onClick={()=>onChange({...filter,excludeNostalgia:!filter.excludeNostalgia})}>排除怀旧赛道</button></div>{filter.base==='custom'&&<div className="match-custom-pool"><TrackSelector tracks={tracks} selectedIds={filter.customTrackIds} multi compact onSelect={track=>onChange({...filter,customTrackIds:filter.customTrackIds.includes(track.id)?filter.customTrackIds.filter(id=>id!==track.id):[...filter.customTrackIds,track.id]})}/></div>}{!filter.stars.length&&<p className="field-error">至少选择一个星级。</p>}{filter.base==='custom'&&!filter.customTrackIds.length&&<p className="field-error">自定义图池至少选择一张地图。</p>}</section>
}

function TrackPicker({data,match,onPick,onClose}:{data:AppData;match:MatchState;onPick:(id:string)=>void;onClose:()=>void}){
  const [randomTrack,setRandomTrack]=useState<Track|null>(null)
  const overtime=evaluateGrandRound(match).phase==='overtime'&&match.specialRules.includes('巅峰鏖战')
  const candidates=matchTrackCandidates(match,data.tracks)
  const random=()=>{if(candidates.length)setRandomTrack(candidates[Math.floor(Math.random()*candidates.length)])}
  const authority=pickAuthority(match)
  return <Modal title="选择本局赛道" onClose={onClose} wide><div className="picker-head"><p>{authority&&<>选图权：<strong>{authority}</strong><br/></>}{overtime?'巅峰鏖战 · 五星及以上，Ban 图除外':poolName(match.trackPool)} · 当前可选 {candidates.length} 张</p><button className="btn primary" disabled={!candidates.length} onClick={random}><Dices size={16}/> 随机选图</button></div>{!candidates.length&&<p className="field-error">没有符合条件的可选赛道。</p>}<TrackSelector tracks={candidates} onSelect={track=>onPick(track.id)}/>{randomTrack&&<TrackConfirmation track={randomTrack} onCancel={()=>setRandomTrack(null)} onConfirm={()=>{onPick(randomTrack.id);setRandomTrack(null)}}/>}</Modal>
}

function RoundEditor({data,round,match,save,onClose}:{data:AppData;round:RoundResult;match:MatchState;save:(r:RoundResult)=>string|undefined;onClose:()=>void}){
  const kind=scorePanel(match.modeId),teamMode=isTeamMode(match.modeId)
  const carLimit=match.specialRules.includes('赛车限制')
  const [draft,setDraft]=useState<RoundResult>(()=>({...round,playerScores:round.playerScores||{},playerTimes:round.playerTimes||{},winnerIds:round.winnerIds||[],carIds:round.carIds||{}}))
  const [saveError,setSaveError]=useState('')
  const roundIndex=match.rounds.findIndex(item=>item.id===round.id)
  const previous=match.rounds.slice(0,Math.max(0,roundIndex))
  const isSpeedRound=match.specialRules.includes('全速对决')&&roundIndex>=(match.modeParams.t||1)
  const segmentStart=isSpeedRound?(match.modeParams.t||1):0
  const segmentEnd=isSpeedRound?match.rounds.length:match.specialRules.includes('全速对决')?(match.modeParams.t||1):match.rounds.length
  const otherCarRounds=match.rounds.slice(segmentStart,segmentEnd).filter(item=>item.id!==round.id)
  const sequential=sequencedTeamMode(match)
  const active=activeTeamPlayers(match,previous)
  const participants=Object.fromEntries(match.competitors.map(side=>[side.id,activeRoundPlayer(match,side,roundIndex)]))
  const carParticipants=match.competitors.flatMap(side=>{
    if(!teamMode)return [{key:side.id,name:roundSideName(match,side)}]
    const players=roundPlayers(match,side)
    if(sequential){const player=participants[side.id];return player?[{key:playerKey(side.id,player),name:`${side.name} · ${player.name}`}]:[]}
    return players.map(player=>({key:playerKey(side.id,player),name:`${side.name} · ${player.name}`}))
  })
  const carReady=!carLimit||carParticipants.every(player=>draft.carIds?.[player.key])
  const needsRanking=(roundIndex===0&&bpFeatures(match.specialRules).king)||match.modeId.startsWith('多人混战')
  const competitorIds=match.competitors.map(side=>side.id)
  const calculatedScores=teamMode&&(kind==='points'||kind==='blood')?Object.fromEntries(match.competitors.map(side=>[side.id,(side.players||[]).reduce((sum,player)=>sum+(draft.playerScores?.[playerKey(side.id,player)]||0),0)])):draft.scores
  const rankingScores=teamMode&&kind==='points'?bestPlayerScores(match,draft.playerScores||{}):calculatedScores
  const ranking=draft.ranking||[]
  const rankingLocked=roundIndex===0&&bpFeatures(match.specialRules).king&&match.rounds.length>1&&Boolean(round.ranking)
  const autoRanking=kind==='outcome'&&!draft.winnerIds?.length?null:rankRoundScores(competitorIds,rankingScores)
  const resolvedRanking=rankingLocked?round.ranking:rankRoundScores(competitorIds,rankingScores,ranking)
  const firstCandidates=teamMode&&kind==='points'?firstPlaceCandidates(match,draft.playerScores||{}):[]
  const resolvedFirst=firstCandidates.length===1?firstCandidates[0]:(needsRanking&&resolvedRanking&&firstCandidates.includes(resolvedRanking[0])?resolvedRanking[0]:draft.firstPlaceId&&firstCandidates.includes(draft.firstPlaceId)?draft.firstPlaceId:undefined)
  const firstPlaceRequired=teamMode&&kind==='points'&&!resolvedFirst
  const rankingReady=!needsRanking||Boolean(resolvedRanking)&&(kind!=='outcome'||Boolean(draft.winnerIds?.length))
  const bloodLosses=match.modeId==='kvk组队滴血赛'?match.competitors.map(side=>{const player=participants[side.id];return player?Math.abs(draft.playerScores?.[playerKey(side.id,player)]||0):0}):[]
  const inactiveBloodLoss=match.modeId==='kvk组队滴血赛'&&match.competitors.some(side=>roundPlayers(match,side).some(player=>player.id!==participants[side.id]?.id&&(draft.playerScores?.[playerKey(side.id,player)]||0)!==0))
  const sequenceReady=!sequential||match.competitors.every(side=>Boolean(participants[side.id]))
  const bloodReady=match.modeId!=='kvk组队滴血赛'||(sequenceReady&&!inactiveBloodLoss&&bloodLosses.filter(value=>value>0).length===1&&match.competitors.every((side,index)=>bloodLosses[index]<=(active[side.id]?.health||0)))
  const setWinner=(sideId:string)=>setDraft(current=>({...current,winnerIds:[sideId],scores:Object.fromEntries(match.competitors.map(side=>[side.id,side.id===sideId?1:0]))}))
  const setSideScore=(sideId:string,value:number)=>setDraft(current=>({...current,scores:{...current.scores,[sideId]:kind==='blood'?-Math.abs(value):value}}))
  const setPlayerScore=(sideId:string,player:MatchPlayer,value:number)=>setDraft(current=>({...current,playerScores:{...current.playerScores,[playerKey(sideId,player)]:kind==='blood'?-Math.abs(value):value}}))
  const setTime=(key:string,value:number)=>setDraft(current=>({...current,playerTimes:{...current.playerTimes,[key]:Math.max(0,value)}}))
  function finishSave(result:RoundResult){const error=save(result);if(error)setSaveError(error)}
  function commit(){
    if(!rankingReady||!carReady||firstPlaceRequired||!bloodReady||!sequenceReady)return
    if(kind==='outcome'&&needsRanking&&draft.winnerIds?.[0]!==resolvedRanking?.[0])return
    const result:RoundResult={...draft,...(needsRanking?{ranking:resolvedRanking||undefined}:{}),...(teamMode&&kind==='points'?{firstPlaceId:resolvedFirst}:{}),...(sequential?{activePlayerIds:Object.fromEntries(match.competitors.flatMap(side=>participants[side.id]?[[side.id,participants[side.id]!.id]]:[]))}:{}),scores:calculatedScores}
    if(kind==='outcome'){if(!draft.winnerIds?.length)return;finishSave(result);return}
    if((kind==='points'||kind==='blood')&&teamMode){finishSave(result);return}
    if(kind==='time'){
      const sideTimes=Object.fromEntries(match.competitors.map(side=>[side.id,teamMode?(side.players||[]).reduce((sum,player)=>sum+(draft.playerTimes?.[playerKey(side.id,player)]||0),0):(draft.playerTimes?.[side.id]||0)]))
      const valid=Object.values(sideTimes).filter(value=>value>0);if(valid.length!==match.competitors.length)return
      const best=Math.min(...valid),winnerIds=match.competitors.filter(side=>sideTimes[side.id]===best).map(side=>side.id)
      finishSave({...draft,winnerIds,scores:Object.fromEntries(match.competitors.map(side=>[side.id,winnerIds.includes(side.id)?1:0]))});return
    }
    finishSave(result)
  }
  const title=kind==='outcome'?'选择本小局胜方':kind==='points'?'录入本小局积分':kind==='blood'?'录入本小局扣血':'录入本小局成绩'
  return <Modal title={title} onClose={onClose} wide={teamMode}><div className="stack-form mode-round-editor">
    {sequential&&<div className="active-players"><strong>本局上场选手</strong><div>{match.competitors.map(side=><span key={side.id}><small>{side.name}</small><b>{participants[side.id]?.name||'已淘汰'}</b>{match.modeId==='kvk组队滴血赛'&&<em>{active[side.id]?.health??0} 血</em>}</span>)}</div><p>{match.modeId==='kvk接力抢n'?'按设置的顺序接力；一方达到换棒分数后，双方同时换下一位。':'每队按设置顺序出场，当前选手血量耗尽后自动换下一位。'}</p></div>}
    {kind==='outcome'?<><div className="winner-options">{match.competitors.map(side=><button key={side.id} className={draft.winnerIds?.includes(side.id)?'active':''} onClick={()=>setWinner(side.id)}><Avatar competitor={side}/><span><strong>{roundSideName(match,side)}</strong><small>{sequential?`上场：${participants[side.id]?.name||"—"} · `:""}{draft.winnerIds?.includes(side.id)?'本局获胜':'点击设为胜方'}</small></span>{draft.winnerIds?.includes(side.id)&&<Crown size={18}/>}</button>)}</div></>:<><div className="mode-score-groups">{match.competitors.map(side=><section key={side.id} style={{'--team-color':side.color} as React.CSSProperties}><header><Avatar competitor={side}/><strong>{side.name}</strong>{teamMode&&<small>{side.players?.length||0} 名队员</small>}</header><div>{teamMode?(match.modeId==='kvk组队滴血赛'?(participants[side.id]?[participants[side.id]!]:[]):roundPlayers(match,side)).map(player=>{const key=playerKey(side.id,player),stored=kind==='time'?draft.playerTimes?.[key]||0:draft.playerScores?.[key]||0;const before=match.modeId==='kvk组队滴血赛'?(active[side.id]?.health||0):(match.modeParams.n||5)+previous.reduce((sum,item)=>sum+(item.playerScores?.[key]||0),0);return <label key={player.id}><span><b>{player.name}</b>{kind==='blood'&&<small>当前 {before} 血</small>}</span><input type="number" min="0" step={kind==='time'?'0.001':'1'} value={kind==='blood'?Math.abs(stored):stored} onChange={e=>kind==='time'?setTime(key,Number(e.target.value)):setPlayerScore(side.id,player,Number(e.target.value))}/><em>{kind==='time'?'秒':kind==='blood'?'扣血':'分'}</em></label>}):<label><span><b>{roundSideName(match,side)}</b>{kind==='blood'&&<small>当前 {(match.modeParams.n||5)+previous.reduce((sum,item)=>sum+(item.scores[side.id]||0),0)} 血</small>}</span><input type="number" min="0" step={kind==='time'?'0.001':'1'} value={kind==='time'?draft.playerTimes?.[side.id]||0:kind==='blood'?Math.abs(draft.scores[side.id]||0):draft.scores[side.id]||0} onChange={e=>kind==='time'?setTime(side.id,Number(e.target.value)):setSideScore(side.id,Number(e.target.value))}/><em>{kind==='time'?'秒':kind==='blood'?'扣血':'分'}</em></label>}</div></section>)}</div></>}
    {needsRanking&&!rankingLocked&&!autoRanking&&<div className="first-round-ranking"><strong>{roundIndex===0?"首局排名":"本局排名"}</strong><p>选手最高分相同时，请按实际冲线顺序点击同分参赛方；其他名次由成绩自动计算。</p><div>{match.competitors.map(side=>{const position=(resolvedRanking||ranking).indexOf(side.id),tied=competitorIds.filter(id=>rankingScores[id]===rankingScores[side.id]).length>1;return <button type="button" key={side.id} disabled={!tied||ranking.includes(side.id)} className={position>=0?'active':''} onClick={()=>setDraft({...draft,ranking:[...ranking,side.id]})}><span>{position>=0?(resolvedRanking?`第 ${position+1} 名`:`已选 ${position+1}`):tied?'同分待排序':'自动排名'}</span><strong>{roundSideName(match,side)}</strong></button>})}</div>{ranking.length>0&&<button type="button" className="text-btn" onClick={()=>setDraft({...draft,ranking:[]})}>重新选择同分顺序</button>}</div>}
    {teamMode&&kind==='points'&&firstCandidates.length>1&&!needsRanking&&<div className="round-first-place"><strong>最高分选手并列</strong><p>请确认实际第一名所属队伍，以确定选图权和全速对决顺序。</p><div>{match.competitors.filter(side=>firstCandidates.includes(side.id)).map(side=><button type="button" key={side.id} className={resolvedFirst===side.id?'active':''} onClick={()=>setDraft({...draft,firstPlaceId:side.id})}>{side.name}</button>)}</div></div>}
    {carLimit&&<div className="round-car-usage"><div><strong>赛车限制</strong><span>每位上场选手的赛车只能使用一次{isSpeedRound?'；全速对决已重置使用记录':''}</span></div>{carParticipants.map(player=>{const used=new Set(otherCarRounds.map(item=>item.carIds?.[player.key]).filter(Boolean));const available=data.cars.filter(car=>!used.has(car.id)||draft.carIds?.[player.key]===car.id);return <label key={player.key}><span>{player.name}</span><select value={draft.carIds?.[player.key]||''} onChange={e=>setDraft({...draft,carIds:{...draft.carIds,[player.key]:e.target.value}})}><option value="">选择本局赛车</option>{available.map(car=><option key={car.id} value={car.id}>{car.grade} · {car.name}</option>)}</select><small>已使用 {used.size} 辆</small></label>})}</div>}
    {match.modeId==='kvk组队滴血赛'&&!bloodReady&&<p className="form-help">{inactiveBloodLoss?'这条旧记录包含未上场队员的扣血，无法按顺序安全修改。':'请只填写一方上场选手的扣血，且不能超过其当前血量。'}</p>}
    {saveError&&<p className="field-error" role="alert">{saveError}</p>}
    <label>备注（可选）<textarea rows={2} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} placeholder="排名、判罚或特殊情况…"/></label><button className="btn primary full" disabled={!carReady||!rankingReady||firstPlaceRequired||!bloodReady||!sequenceReady||(kind==='outcome'&&needsRanking&&resolvedRanking?.[0]!==draft.winnerIds?.[0])} onClick={commit}><Save size={16}/> 保存本小局</button>
  </div></Modal>
}

function ArchiveModal({archives,onRestore,onDelete,onClose}:{archives:SavedMatch[];onRestore:(m:SavedMatch)=>void;onDelete:(id:string)=>void;onClose:()=>void}){return <Modal title="已保存的比赛战绩" onClose={onClose} wide><div className="archive-list">{archives.length?archives.map(item=>{const score=totals(item.match);return <div className="archive-row" key={item.id}><div className="archive-icon"><Archive/></div><div className="archive-info"><strong>{item.name}</strong><span>{item.match.competitors.map(c=>`${c.name} ${score[c.id]||0}`).join(' · ')} · {item.match.rounds.length} 局</span></div><time>{new Date(item.savedAt).toLocaleString('zh-CN')}</time><button className="btn small ghost" onClick={()=>onRestore(item)}><RotateCcw size={14}/> 恢复到计分台</button><button className="icon-btn danger" onClick={()=>onDelete(item.id)}><Trash2 size={15}/></button></div>}):<div className="empty-state"><Archive/><h3>还没有保存的战绩</h3><p>比赛进行后，点击计分台顶部的“保存战绩”</p></div>}</div></Modal>}
