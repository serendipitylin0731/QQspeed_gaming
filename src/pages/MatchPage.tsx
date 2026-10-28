import { useMemo, useState } from 'react'
import { Archive, Check, Crown, Dices, Flag, ImagePlus, Plus, RotateCcw, Save, Settings2, Trash2, Trophy, X } from 'lucide-react'
import { Modal } from '../components/Modal'
import { SmartImage } from '../components/SmartImage'
import { TrackSelector } from '../components/TrackSelector'
import { initialData } from '../data/seed'
import type { AppData, Competitor, MatchPlayer, MatchState, RoundResult, SavedMatch } from '../types'

const modes=['1v1单挑抢n','1v1绝活单挑赛','计时挑战赛','多人混战滴血赛','多人混战积分赛','多人混战抢n','kvk接力抢n','kvk组队滴血赛','kvk组队积分赛','kvk组队计时赛','kvk组队抢n']
const colors=['#42a5ff','#ff8a47','#9d6cff','#1ecb9b','#ef6680','#e3bd42']
const specialOptions:Record<string,string[]>={
  '1v1单挑抢n':['首图：随机图','首图：指定图','赛车限制','赛道BP','鏖战','巅峰鏖战'],
  '计时挑战赛':['选图：随机地图','选图：指定地图'],
  '多人混战滴血赛':['首图：随机图','首图：指定图','赛道BP（王图）'],
  '多人混战积分赛':['首图：随机图','首图：指定图','赛道BP（王图）','同分加赛'],
  '多人混战抢n':['首图：随机图','首图：指定图','赛道BP（王图）'],
  'kvk接力抢n':['首图：随机图','首图：指定图'],
  'kvk组队滴血赛':['首图：随机图','首图：指定图'],
  'kvk组队积分赛':['首图：随机图','首图：指定图','赛道BP','全速对决'],
  'kvk组队计时赛':['首图：随机图','首图：指定图'],
  'kvk组队抢n':['首图：随机图','首图：指定图','赛道BP'],
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
function playerKey(sideId:string,player:MatchPlayer){return `${sideId}:${player.id}`}
function roundTotals(match:MatchState){return Object.fromEntries(match.competitors.map(c=>[c.id,match.rounds.reduce((sum,r)=>sum+(r.scores[c.id]||0),0)]))}
function displaySideScore(match:MatchState,side:Competitor){
  const total=roundTotals(match)[side.id]||0
  if(scorePanel(match.modeId)==='blood')return rosterSize(match)*(match.modeParams.n||5)+total
  return total
}
function formatTime(seconds:number){if(!Number.isFinite(seconds)||seconds<=0)return '--:--.---';const minutes=Math.floor(seconds/60);return `${String(minutes).padStart(2,'0')}:${(seconds-minutes*60).toFixed(3).padStart(6,'0')}`}

function totals(match:MatchState){return roundTotals(match)}
function scoringStructure(match:MatchState){
  return JSON.stringify({
    modeId:match.modeId,
    modeParams:match.modeParams,
    competitors:match.competitors.map(side=>({id:side.id,players:side.players?.map(player=>player.id)||[]})),
  })
}

export function MatchPage({ data, update }: { data: AppData; update: (fn: (d: AppData) => AppData) => void }) {
  const match=data.match
  const [settings,setSettings]=useState(false),[picking,setPicking]=useState(false),[editingRound,setEditingRound]=useState<RoundResult|null>(null),[archives,setArchives]=useState(false),[resetArmed,setResetArmed]=useState(false)
  const currentTotals=useMemo(()=>totals(match),[match])
  const patch=(value:Partial<MatchState>)=>update(d=>({...d,match:{...d.match,...value}}))
  function addRound(trackId:string){const round:RoundResult={id:`round-${Date.now()}`,trackId,scores:Object.fromEntries(match.competitors.map(x=>[x.id,0])),notes:''};patch({rounds:[...match.rounds,round],activeRound:match.rounds.length});setPicking(false);setEditingRound(round)}
  function updateRound(round:RoundResult){patch({rounds:match.rounds.map(x=>x.id===round.id?round:x)});setEditingRound(null)}
  function nextGrand(){if(!match.rounds.length)return;const max=Math.max(...Object.values(currentTotals)),winnerIds=match.competitors.filter(x=>currentTotals[x.id]===max).map(x=>x.id);patch({competitors:match.competitors.map(x=>({...x,grandScore:x.grandScore+(winnerIds.includes(x.id)?1:0),score:0})),completedGrandRounds:[...match.completedGrandRounds,{id:`grand-${Date.now()}`,modeId:match.modeId,specialRules:match.specialRules,rounds:structuredClone(match.rounds),finalScores:currentTotals,winnerIds,completedAt:new Date().toISOString()}],rounds:[],activeRound:0});setSettings(true)}
  function saveArchive(){if(!match.rounds.length)return;const archive:SavedMatch={id:`archive-${Date.now()}`,name:`${match.modeId} · ${new Date().toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}`,savedAt:new Date().toISOString(),match:structuredClone(match)};update(d=>({...d,matchArchives:[archive,...d.matchArchives]}))}
  function restart(){update(d=>({...d,match:structuredClone(initialData.match)}));setSettings(false);setPicking(false);setEditingRound(null);setResetArmed(false)}
  if(!match.configured) return <MatchSetupScreen match={match} onConfirm={next=>patch({...next,configured:true,rounds:[],activeRound:0})}/>
  return <div className="match-page page-enter">
    <div className="match-topbar panel"><div className="match-heading"><span className="eyebrow">第 {match.completedGrandRounds.length+1} 大局</span><div className="match-primary-actions"><button className="btn primary" onClick={()=>setPicking(true)}><Plus size={17}/> 添加小局</button><button className="btn grand-finish" disabled={!match.rounds.length} onClick={nextGrand}><Crown size={16}/> 结束本大局</button></div></div>
      {match.competitors.length===2?<DuelScoreboard match={match}/>:<><div className="multi-mode"><strong>{match.modeId}</strong>{match.specialRules.length>0&&<div className="active-specials">{match.specialRules.map(rule=><span key={rule}>{rule}</span>)}</div>}</div><div className={`scoreboard competitors-${match.competitors.length}`}>{match.competitors.map(team=><div className="team-score" key={team.id} style={{'--team-color':team.color} as React.CSSProperties}><Avatar competitor={team}/><div className="team-label"><strong>{team.name}</strong>{match.showGrandScore&&<small>大分 {team.grandScore}</small>}</div><div className="computed-score"><small>{scorePanel(match.modeId)==='blood'?'剩余血量':'当前小分'}</small><strong>{displaySideScore(match,team)}</strong></div></div>)}</div></>}
      <div className="match-tools"><button onClick={()=>setSettings(true)}><Settings2 size={14}/> 修改本大局</button><button disabled={!match.rounds.length} onClick={saveArchive}><Save size={14}/> 保存战绩</button><button onClick={()=>setArchives(true)}><Archive size={14}/> 战绩库（{data.matchArchives.length}）</button><span/><button className={resetArmed?'reset-confirm':''} onClick={()=>resetArmed?restart():setResetArmed(true)}><RotateCcw size={14}/>{resetArmed?'确认清空并重新开始':'重新开始比赛'}</button>{resetArmed&&<button onClick={()=>setResetArmed(false)}>取消</button>}</div>
    </div>
    <div className="match-guide"><span><b>1</b> 添加小局</span><i>→</i><span><b>2</b> 点击小局录入比分</span><i>→</i><span><b>3</b> 结束大局，最高分方大分 +1</span></div>
    {match.completedGrandRounds.length>0&&<div className="grand-history">{match.completedGrandRounds.map((grand,index)=><div key={grand.id}><span>第 {index+1} 大局</span><strong>{grand.modeId}</strong><small>{match.competitors.map(c=>`${c.name} ${grand.finalScores[c.id]||0}`).join(' : ')}</small></div>)}</div>}
    <div className="rounds-header"><div><span className="eyebrow">SMALL ROUNDS</span><h2>当前大局 · 小局战绩</h2></div><p>共 {match.rounds.length} 小局 · 当前大局总分由小局比分累计</p></div>
    {match.rounds.length>0&&<div className="round-scroll">{match.rounds.map((round,index)=>{const track=data.tracks.find(x=>x.id===round.trackId);return <button className={`round-card ${match.activeRound===index?'active':''}`} key={round.id} onClick={()=>{patch({activeRound:index});setEditingRound(round)}}><div className="round-image"><SmartImage src={track?.coverVertical||track?.coverHorizontal}/><span className="round-number">小局 {String(index+1).padStart(2,'0')}</span><div className="round-overlay"><span>{track?.star||0} ★</span><strong>{track?.name||'未知赛道'}</strong></div></div><RoundScoreSummary match={match} round={round} roundIndex={index}/></button>})}<button className="round-add" onClick={()=>setPicking(true)}><span><Plus/></span><strong>添加下一小局</strong><small>选择赛道并录入比分</small></button></div>}
    {!match.rounds.length&&<div className="match-empty"><div className="flag-orbit"><Flag/></div><h2>本大局还没有小局</h2><p>先添加赛道；每局结束后点击赛道卡片录入比分。</p><button className="btn primary" onClick={()=>setPicking(true)}><Dices size={17}/> 添加第一小局</button></div>}
    {settings&&<MatchSettings match={match} onSave={next=>{const reset=scoringStructure(next)!==scoringStructure(match);patch({...next,configured:true,rounds:reset?[]:match.rounds,activeRound:reset?0:match.activeRound});setSettings(false)}} onClose={()=>setSettings(false)}/>}
    {picking&&<TrackPicker data={data} onPick={addRound} onClose={()=>setPicking(false)}/>} {editingRound&&<RoundEditor round={editingRound} match={match} save={updateRound} onClose={()=>setEditingRound(null)}/>}
    {archives&&<ArchiveModal archives={data.matchArchives} onRestore={saved=>{update(d=>({...d,match:structuredClone(saved.match)}));setArchives(false)}} onDelete={id=>update(d=>({...d,matchArchives:d.matchArchives.filter(x=>x.id!==id)}))} onClose={()=>setArchives(false)}/>}
  </div>
}

function DuelScoreboard({match}:{match:MatchState}){
  const [left,right]=match.competitors
  const kind=scorePanel(match.modeId)
  const scoreLabel=kind==='blood'?'剩余血量':'小分'
  const side=(competitor:Competitor,position:'left'|'right')=><div className={`duel-side ${position}`} style={{'--team-color':competitor.color} as React.CSSProperties}>
    {position==='left'&&match.showGrandScore&&<div className="duel-grand"><strong>{competitor.grandScore}</strong><span>大分</span></div>}
    {position==='right'&&<div className="duel-small"><span>{scoreLabel}</span><strong>{displaySideScore(match,competitor)}</strong></div>}
    <Avatar competitor={competitor}/><div className="duel-name"><strong>{competitor.name}</strong>{competitor.players?.length&&isTeamMode(match.modeId)?<small>{competitor.players.map(p=>p.name).join(' / ')}</small>:null}</div>
    {position==='left'&&<div className="duel-small"><span>{scoreLabel}</span><strong>{displaySideScore(match,competitor)}</strong></div>}
    {position==='right'&&match.showGrandScore&&<div className="duel-grand"><strong>{competitor.grandScore}</strong><span>大分</span></div>}
  </div>
  return <div className="duel-scoreboard">{side(left,'left')}<div className="duel-mode"><span>当前模式</span><strong>{match.modeId}</strong>{match.specialRules.length>0&&<div className="active-specials">{match.specialRules.map(rule=><span key={rule}>{rule}</span>)}</div>}</div>{side(right,'right')}</div>
}

function RoundScoreSummary({match,round,roundIndex}:{match:MatchState;round:RoundResult;roundIndex:number}){
  const kind=scorePanel(match.modeId)
  const through=match.rounds.slice(0,roundIndex+1)
  return <div className={`round-scores score-${kind}`}>{match.competitors.map(side=>{
    const value=round.scores[side.id]||0
    const cumulative=through.reduce((sum,item)=>sum+(item.scores[side.id]||0),0)
    const players=isTeamMode(match.modeId)?side.players||[]:[]
    const currentTime=players.length?players.reduce((sum,p)=>sum+(round.playerTimes?.[playerKey(side.id,p)]||0),0):(round.playerTimes?.[side.id]||0)
    const remaining=rosterSize(match)*(match.modeParams.n||5)+cumulative
    return <div className="round-side-summary" key={side.id}><span><i style={{background:side.color}}/>{side.name}</span><span className="round-points">
      {kind==='outcome'&&<><strong className={round.winnerIds?.includes(side.id)?'positive':''}>{round.winnerIds?.includes(side.id)?'胜':'负'}</strong><small>小分 {cumulative}</small></>}
      {kind==='points'&&<><strong className={value>0?'positive':''}>{value>0?'+':''}{value}</strong><small>累计 {cumulative}</small></>}
      {kind==='blood'&&<><strong className="negative">{value||0}</strong><small>剩余 {remaining}</small></>}
      {kind==='time'&&<><strong>{formatTime(currentTime)}</strong><small>胜场 {cumulative}</small></>}
    </span>{players.length>0&&<div className="round-player-lines">{players.map(player=>{const key=playerKey(side.id,player);const playerValue=round.playerScores?.[key]||0;const playerRemaining=(match.modeParams.n||5)+through.reduce((sum,item)=>sum+(item.playerScores?.[key]||0),0);return <small key={player.id}><b>{player.name}</b>{kind==='time'?formatTime(round.playerTimes?.[key]||0):kind==='blood'?`剩余 ${playerRemaining}`:`${playerValue>0?'+':''}${playerValue}`}</small>})}</div>}</div>
  })}</div>
}

function Avatar({competitor}:{competitor:Competitor}){return competitor.avatar?<SmartImage className="team-avatar" src={competitor.avatar}/>:<span className="team-avatar fallback" style={{background:competitor.color}}>{competitor.name.slice(0,1)}</span>}
function MatchSetupScreen({match,onConfirm}:{match:MatchState;onConfirm:(m:MatchState)=>void}){return <div className="match-setup-screen page-enter"><div className="setup-intro"><span className="setup-mark"><Trophy/></span><span className="eyebrow">NEW MATCH</span><h1>开始一场新比赛</h1><p>选择玩法，确认参赛方，然后进入计分台。</p></div><div className="panel setup-panel"><MatchEditor match={match} onConfirm={onConfirm}/></div></div>}
function MatchSettings({match,onSave,onClose}:{match:MatchState;onSave:(m:MatchState)=>void;onClose:()=>void}){return <Modal title="对局设置" onClose={onClose} wide><MatchEditor match={match} onConfirm={onSave}/></Modal>}

function MatchEditor({match,onConfirm}:{match:MatchState;onConfirm:(m:MatchState)=>void}){
  const [draft,setDraft]=useState<MatchState>(()=>{const copy=structuredClone(match);if(isTeamMode(copy.modeId))copy.competitors=resizeRosters(copy.competitors,rosterSize(copy));return copy})
  const [showRules,setShowRules]=useState(match.specialRules.length>0)
  const add=()=>{if(draft.competitors.length>=6)return;const n=draft.competitors.length,id=`side-${Date.now()}`;const side:Competitor={id,name:`参赛方 ${n+1}`,grandScore:0,score:0,color:colors[n%colors.length]};if(isTeamMode(draft.modeId))side.players=Array.from({length:rosterSize(draft)},(_,i)=>({id:`${id}-player-${i+1}`,name:`队员 ${i+1}`}));setDraft({...draft,competitors:[...draft.competitors,side]})}
  const patchCompetitor=(id:string,patch:Partial<Competitor>)=>setDraft({...draft,competitors:draft.competitors.map(c=>c.id===id?{...c,...patch}:c)})
  const patchPlayer=(sideId:string,playerId:string,name:string)=>setDraft({...draft,competitors:draft.competitors.map(side=>side.id===sideId?{...side,players:side.players?.map(player=>player.id===playerId?{...player,name}:player)}:side)})
  const upload=(id:string,file?:File)=>{if(!file)return;const reader=new FileReader();reader.onload=()=>patchCompetitor(id,{avatar:String(reader.result)});reader.readAsDataURL(file)}
  const options=specialOptions[draft.modeId]||[]
  const toggleSpecial=(option:string)=>setDraft(current=>{
    if(current.specialRules.includes(option)) return {...current,specialRules:current.specialRules.filter(x=>x!==option)}
    const group=option.startsWith('首图：')?'首图：':option.startsWith('选图：')?'选图：':['鏖战','巅峰鏖战'].includes(option)?'决胜规则':''
    const remaining=group?current.specialRules.filter(x=>group==='决胜规则'?!['鏖战','巅峰鏖战'].includes(x):!x.startsWith(group)):current.specialRules
    return {...current,specialRules:[...remaining,option]}
  })
  const params=modeParamKeys[draft.modeId]||[]
  const invalid=draft.competitors.length<2||draft.competitors.some(side=>!side.name.trim()||(isTeamMode(draft.modeId)&&side.players?.some(player=>!player.name.trim())))
  return <div className="match-editor">
    <div className="setup-options"><label>玩法<select value={draft.modeId} onChange={e=>{const modeId=e.target.value;setDraft(current=>({...current,modeId,specialRules:[],competitors:isTeamMode(modeId)?resizeRosters(current.competitors,current.modeParams.k||2):current.competitors}))}}>{modes.map(x=><option key={x}>{x}</option>)}</select></label><label className="display-grand"><span><strong>显示大分</strong><small>适用于多大局比赛</small></span><button type="button" className={`switch ${draft.showGrandScore?'on':''}`} onClick={()=>setDraft({...draft,showGrandScore:!draft.showGrandScore})}><span/></button></label></div>
    {params.length>0&&<div className="mode-params"><div><strong>玩法参数</strong><span>填写本玩法需要的数值</span></div><div>{params.map(key=><label key={key}>{paramLabels[key]}<input type="number" min="1" value={draft.modeParams[key]||1} onChange={e=>{const value=Math.max(1,Number(e.target.value)||1);setDraft(current=>({...current,modeParams:{...current.modeParams,[key]:value},competitors:key==='k'?resizeRosters(current.competitors,value):current.competitors}))}}/></label>)}</div></div>}
    {options.length>0&&<><button className="optional-rules-toggle" onClick={()=>setShowRules(!showRules)}>{showRules?'收起可选规则':`设置可选规则${draft.specialRules.length?`（已选 ${draft.specialRules.length} 项）`:''}`}</button>{showRules&&<div className="special-rule-picker simple"><div>{options.map(option=><button key={option} className={draft.specialRules.includes(option)?'active':''} onClick={()=>toggleSpecial(option)}>{draft.specialRules.includes(option)&&<Check size={13}/>} {option}</button>)}</div></div>}</>}
    <div className="form-row-title"><div><strong>{isTeamMode(draft.modeId)?'参赛队伍与队员 ID':'参赛选手'}</strong><span>{isTeamMode(draft.modeId)?`每队 ${rosterSize(draft)} 人，逐人录入成绩`:'至少 2 人，最多 6 人'}</span></div><button className="btn small ghost" onClick={add} disabled={draft.competitors.length>=6}><Plus size={14}/> 添加参赛方</button></div>
    <div className="competitor-cards">{draft.competitors.map((c,index)=><div className={`competitor-card ${isTeamMode(draft.modeId)?'with-roster':''}`} key={c.id}><label className="avatar-upload">{c.avatar?<SmartImage src={c.avatar}/>:<><ImagePlus/><span>队徽 / 头像</span></>}<input type="file" accept="image/*" onChange={e=>upload(c.id,e.target.files?.[0])}/></label><div className="competitor-fields"><label>{isTeamMode(draft.modeId)?'队名':'玩家 ID'}<input value={c.name} onChange={e=>patchCompetitor(c.id,{name:e.target.value})}/></label><label>识别色<div className="color-input"><input type="color" value={c.color} onChange={e=>patchCompetitor(c.id,{color:e.target.value})}/><span>{c.color}</span></div></label></div><button className="icon-btn remove-competitor" disabled={draft.competitors.length<=2} onClick={()=>setDraft({...draft,competitors:draft.competitors.filter(x=>x.id!==c.id)})}><X size={16}/></button><span className="competitor-index">{String(index+1).padStart(2,'0')}</span>{isTeamMode(draft.modeId)&&<div className="roster-editor"><span>队员 ID</span><div>{c.players?.map((player,playerIndex)=><label key={player.id}><b>{playerIndex+1}</b><input value={player.name} onChange={e=>patchPlayer(c.id,player.id,e.target.value)} placeholder={`队员 ${playerIndex+1}`}/></label>)}</div></div>}</div>)}</div>
    <button className="btn primary confirm-match" disabled={invalid} onClick={()=>onConfirm(draft)}><Check size={16}/> 开始第 {draft.completedGrandRounds.length+1} 大局</button>
  </div>
}

function TrackPicker({data,onPick,onClose}:{data:AppData;onPick:(id:string)=>void;onClose:()=>void}){const random=()=>{const pool=data.tracks.filter(x=>x.pools.peak);const source=pool.length?pool:data.tracks;if(source.length)onPick(source[Math.floor(Math.random()*source.length)].id)};return <Modal title="选择本局赛道" onClose={onClose} wide><div className="picker-head"><p>可按名称、星级、标签和王图筛选</p><button className="btn primary" onClick={random}><Dices size={16}/> 从巅峰赛图池随机</button></div><TrackSelector tracks={data.tracks} onSelect={track=>onPick(track.id)}/></Modal>}

function RoundEditor({round,match,save,onClose}:{round:RoundResult;match:MatchState;save:(r:RoundResult)=>void;onClose:()=>void}){
  const kind=scorePanel(match.modeId),teamMode=isTeamMode(match.modeId)
  const [draft,setDraft]=useState<RoundResult>(()=>({...round,playerScores:round.playerScores||{},playerTimes:round.playerTimes||{},winnerIds:round.winnerIds||[]}))
  const roundIndex=match.rounds.findIndex(item=>item.id===round.id)
  const previous=match.rounds.slice(0,Math.max(0,roundIndex))
  const setWinner=(sideId:string)=>setDraft(current=>({...current,winnerIds:[sideId],scores:Object.fromEntries(match.competitors.map(side=>[side.id,side.id===sideId?1:0]))}))
  const setSideScore=(sideId:string,value:number)=>setDraft(current=>({...current,scores:{...current.scores,[sideId]:kind==='blood'?-Math.abs(value):value}}))
  const setPlayerScore=(sideId:string,player:MatchPlayer,value:number)=>setDraft(current=>({...current,playerScores:{...current.playerScores,[playerKey(sideId,player)]:kind==='blood'?-Math.abs(value):value}}))
  const setTime=(key:string,value:number)=>setDraft(current=>({...current,playerTimes:{...current.playerTimes,[key]:Math.max(0,value)}}))
  function commit(){
    if(kind==='outcome'){if(!draft.winnerIds?.length)return;save(draft);return}
    if(kind==='points'&&teamMode){const scores=Object.fromEntries(match.competitors.map(side=>[side.id,(side.players||[]).reduce((sum,player)=>sum+(draft.playerScores?.[playerKey(side.id,player)]||0),0)]));save({...draft,scores});return}
    if(kind==='blood'&&teamMode){const scores=Object.fromEntries(match.competitors.map(side=>[side.id,(side.players||[]).reduce((sum,player)=>sum+(draft.playerScores?.[playerKey(side.id,player)]||0),0)]));save({...draft,scores});return}
    if(kind==='time'){
      const sideTimes=Object.fromEntries(match.competitors.map(side=>[side.id,teamMode?(side.players||[]).reduce((sum,player)=>sum+(draft.playerTimes?.[playerKey(side.id,player)]||0),0):(draft.playerTimes?.[side.id]||0)]))
      const valid=Object.values(sideTimes).filter(value=>value>0);if(valid.length!==match.competitors.length)return
      const best=Math.min(...valid),winnerIds=match.competitors.filter(side=>sideTimes[side.id]===best).map(side=>side.id)
      save({...draft,winnerIds,scores:Object.fromEntries(match.competitors.map(side=>[side.id,winnerIds.includes(side.id)?1:0]))});return
    }
    save(draft)
  }
  const title=kind==='outcome'?'选择本小局胜方':kind==='points'?'录入本小局积分':kind==='blood'?'录入本小局扣血':'录入本小局成绩'
  return <Modal title={title} onClose={onClose} wide={teamMode}><div className="stack-form mode-round-editor">
    {kind==='outcome'?<><p className="form-help">只需选择本小局获胜方，系统会自动记录胜负关系并累计小分。</p><div className="winner-options">{match.competitors.map(side=><button key={side.id} className={draft.winnerIds?.includes(side.id)?'active':''} onClick={()=>setWinner(side.id)}><Avatar competitor={side}/><span><strong>{side.name}</strong><small>{draft.winnerIds?.includes(side.id)?'本局获胜':'点击设为胜方'}</small></span>{draft.winnerIds?.includes(side.id)&&<Crown size={18}/>}</button>)}</div></>:<><p className="form-help">{kind==='points'?'逐项填写本局得分，组队模式会自动汇总队伍小分。':kind==='blood'?'填写本局扣除的血量，保存后自动计算每人和每队的剩余血量。':'填写完成时间（秒），组队模式会自动合计时间并判定本局胜方。'}</p><div className="mode-score-groups">{match.competitors.map(side=><section key={side.id} style={{'--team-color':side.color} as React.CSSProperties}><header><Avatar competitor={side}/><strong>{side.name}</strong>{teamMode&&<small>{side.players?.length||0} 名队员</small>}</header><div>{teamMode?(side.players||[]).map(player=>{const key=playerKey(side.id,player),stored=kind==='time'?draft.playerTimes?.[key]||0:draft.playerScores?.[key]||0;const before=(match.modeParams.n||5)+previous.reduce((sum,item)=>sum+(item.playerScores?.[key]||0),0);return <label key={player.id}><span><b>{player.name}</b>{kind==='blood'&&<small>当前 {before} 血</small>}</span><input type="number" min="0" step={kind==='time'?'0.001':'1'} value={kind==='blood'?Math.abs(stored):stored} onChange={e=>kind==='time'?setTime(key,Number(e.target.value)):setPlayerScore(side.id,player,Number(e.target.value))}/><em>{kind==='time'?'秒':kind==='blood'?'扣血':'分'}</em></label>}):<label><span><b>{side.name}</b>{kind==='blood'&&<small>当前 {(match.modeParams.n||5)+previous.reduce((sum,item)=>sum+(item.scores[side.id]||0),0)} 血</small>}</span><input type="number" min="0" step={kind==='time'?'0.001':'1'} value={kind==='time'?draft.playerTimes?.[side.id]||0:kind==='blood'?Math.abs(draft.scores[side.id]||0):draft.scores[side.id]||0} onChange={e=>kind==='time'?setTime(side.id,Number(e.target.value)):setSideScore(side.id,Number(e.target.value))}/><em>{kind==='time'?'秒':kind==='blood'?'扣血':'分'}</em></label>}</div></section>)}</div></>}
    <label>备注（可选）<textarea rows={2} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} placeholder="排名、判罚或特殊情况…"/></label><button className="btn primary full" onClick={commit}><Save size={16}/> 保存本小局</button>
  </div></Modal>
}

function ArchiveModal({archives,onRestore,onDelete,onClose}:{archives:SavedMatch[];onRestore:(m:SavedMatch)=>void;onDelete:(id:string)=>void;onClose:()=>void}){return <Modal title="已保存的比赛战绩" onClose={onClose} wide><div className="archive-list">{archives.length?archives.map(item=>{const score=totals(item.match);return <div className="archive-row" key={item.id}><div className="archive-icon"><Archive/></div><div className="archive-info"><strong>{item.name}</strong><span>{item.match.competitors.map(c=>`${c.name} ${score[c.id]||0}`).join(' · ')} · {item.match.rounds.length} 局</span></div><time>{new Date(item.savedAt).toLocaleString('zh-CN')}</time><button className="btn small ghost" onClick={()=>onRestore(item)}><RotateCcw size={14}/> 恢复到计分台</button><button className="icon-btn danger" onClick={()=>onDelete(item.id)}><Trash2 size={15}/></button></div>}):<div className="empty-state"><Archive/><h3>还没有保存的战绩</h3><p>比赛进行后，点击计分台顶部的“保存战绩”</p></div>}</div></Modal>}
