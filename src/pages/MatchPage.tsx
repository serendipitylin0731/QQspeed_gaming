import { useMemo, useState } from 'react'
import { Archive, Check, Crown, Dices, Flag, ImagePlus, Minus, Plus, RotateCcw, Save, Settings2, Trash2, Trophy, X } from 'lucide-react'
import { Modal } from '../components/Modal'
import { SmartImage } from '../components/SmartImage'
import { TrackSelector } from '../components/TrackSelector'
import { initialData } from '../data/seed'
import type { AppData, Competitor, MatchState, RoundResult, SavedMatch } from '../types'

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

function totals(match:MatchState){return Object.fromEntries(match.competitors.map(c=>[c.id,match.rounds.reduce((sum,r)=>sum+(r.scores[c.id]||0),0)]))}

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
    <div className="match-topbar panel"><div className="match-heading"><div className="mode-block"><span className="eyebrow">第 {match.completedGrandRounds.length+1} 大局</span><strong className="current-mode-name">{match.modeId}</strong>{match.specialRules.length>0&&<div className="active-specials">{match.specialRules.map(rule=><span key={rule}>{rule}</span>)}</div>}</div><div className="match-primary-actions"><button className="btn primary" onClick={()=>setPicking(true)}><Plus size={17}/> 添加小局</button><button className="btn grand-finish" disabled={!match.rounds.length} onClick={nextGrand}><Crown size={16}/> 结束本大局</button></div></div>
      <div className={`scoreboard competitors-${match.competitors.length}`}>{match.competitors.map(team=><div className="team-score" key={team.id} style={{'--team-color':team.color} as React.CSSProperties}><Avatar competitor={team}/><div className="team-label"><strong>{team.name}</strong>{match.showGrandScore&&<small>大分 {team.grandScore}</small>}</div><div className="computed-score"><small>当前总分</small><strong>{currentTotals[team.id]||0}</strong></div></div>)}</div>
      <div className="match-tools"><button onClick={()=>setSettings(true)}><Settings2 size={14}/> 修改本大局</button><button disabled={!match.rounds.length} onClick={saveArchive}><Save size={14}/> 保存战绩</button><button onClick={()=>setArchives(true)}><Archive size={14}/> 战绩库（{data.matchArchives.length}）</button><span/><button className={resetArmed?'reset-confirm':''} onClick={()=>resetArmed?restart():setResetArmed(true)}><RotateCcw size={14}/>{resetArmed?'确认清空并重新开始':'重新开始比赛'}</button>{resetArmed&&<button onClick={()=>setResetArmed(false)}>取消</button>}</div>
    </div>
    <div className="match-guide"><span><b>1</b> 添加小局</span><i>→</i><span><b>2</b> 点击小局录入比分</span><i>→</i><span><b>3</b> 结束大局，最高分方大分 +1</span></div>
    {match.completedGrandRounds.length>0&&<div className="grand-history">{match.completedGrandRounds.map((grand,index)=><div key={grand.id}><span>第 {index+1} 大局</span><strong>{grand.modeId}</strong><small>{match.competitors.map(c=>`${c.name} ${grand.finalScores[c.id]||0}`).join(' : ')}</small></div>)}</div>}
    <div className="rounds-header"><div><span className="eyebrow">SMALL ROUNDS</span><h2>当前大局 · 小局战绩</h2></div><p>共 {match.rounds.length} 小局 · 当前大局总分由小局比分累计</p></div>
    {match.rounds.length>0&&<div className="round-scroll">{match.rounds.map((round,index)=>{const track=data.tracks.find(x=>x.id===round.trackId);return <button className={`round-card ${match.activeRound===index?'active':''}`} key={round.id} onClick={()=>{patch({activeRound:index});setEditingRound(round)}}><div className="round-image"><SmartImage src={track?.coverVertical||track?.coverHorizontal}/><span className="round-number">小局 {String(index+1).padStart(2,'0')}</span><div className="round-overlay"><span>{track?.star||0} ★</span><strong>{track?.name||'未知赛道'}</strong></div></div><div className="round-scores">{match.competitors.map(c=>{const value=round.scores[c.id]||0,cumulative=match.rounds.slice(0,index+1).reduce((sum,item)=>sum+(item.scores[c.id]||0),0);return <div key={c.id}><span><i style={{background:c.color}}/>{c.name}</span><span className="round-points"><strong className={value>0?'positive':value<0?'negative':''}>{value>0?'+':''}{value}</strong><small>累计 {cumulative}</small></span></div>})}</div></button>})}<button className="round-add" onClick={()=>setPicking(true)}><span><Plus/></span><strong>添加下一小局</strong><small>选择赛道并录入比分</small></button></div>}
    {!match.rounds.length&&<div className="match-empty"><div className="flag-orbit"><Flag/></div><h2>本大局还没有小局</h2><p>先添加赛道；每局结束后点击赛道卡片录入比分。</p><button className="btn primary" onClick={()=>setPicking(true)}><Dices size={17}/> 添加第一小局</button></div>}
    {settings&&<MatchSettings match={match} onSave={next=>{const reset=next.modeId!==match.modeId||next.competitors.map(x=>x.id).join()!==match.competitors.map(x=>x.id).join();patch({...next,configured:true,rounds:reset?[]:match.rounds,activeRound:reset?0:match.activeRound});setSettings(false)}} onClose={()=>setSettings(false)}/>}
    {picking&&<TrackPicker data={data} onPick={addRound} onClose={()=>setPicking(false)}/>} {editingRound&&<RoundEditor round={editingRound} competitors={match.competitors} save={updateRound} onClose={()=>setEditingRound(null)}/>}
    {archives&&<ArchiveModal archives={data.matchArchives} onRestore={saved=>{update(d=>({...d,match:structuredClone(saved.match)}));setArchives(false)}} onDelete={id=>update(d=>({...d,matchArchives:d.matchArchives.filter(x=>x.id!==id)}))} onClose={()=>setArchives(false)}/>}
  </div>
}

function Avatar({competitor}:{competitor:Competitor}){return competitor.avatar?<SmartImage className="team-avatar" src={competitor.avatar}/>:<span className="team-avatar fallback" style={{background:competitor.color}}>{competitor.name.slice(0,1)}</span>}
function MatchSetupScreen({match,onConfirm}:{match:MatchState;onConfirm:(m:MatchState)=>void}){return <div className="match-setup-screen page-enter"><div className="setup-intro"><span className="setup-mark"><Trophy/></span><span className="eyebrow">NEW MATCH</span><h1>开始一场新比赛</h1><p>选择玩法，确认参赛方，然后进入计分台。</p></div><div className="panel setup-panel"><MatchEditor match={match} onConfirm={onConfirm}/></div></div>}
function MatchSettings({match,onSave,onClose}:{match:MatchState;onSave:(m:MatchState)=>void;onClose:()=>void}){return <Modal title="对局设置" onClose={onClose} wide><MatchEditor match={match} onConfirm={onSave}/></Modal>}

function MatchEditor({match,onConfirm}:{match:MatchState;onConfirm:(m:MatchState)=>void}){
  const [draft,setDraft]=useState<MatchState>(structuredClone(match))
  const [showRules,setShowRules]=useState(match.specialRules.length>0)
  const add=()=>{if(draft.competitors.length>=6)return;const n=draft.competitors.length;setDraft({...draft,competitors:[...draft.competitors,{id:`side-${Date.now()}`,name:`参赛方 ${n+1}`,grandScore:0,score:0,color:colors[n%colors.length]}]})}
  const patchCompetitor=(id:string,patch:Partial<Competitor>)=>setDraft({...draft,competitors:draft.competitors.map(c=>c.id===id?{...c,...patch}:c)})
  const upload=(id:string,file?:File)=>{if(!file)return;const reader=new FileReader();reader.onload=()=>patchCompetitor(id,{avatar:String(reader.result)});reader.readAsDataURL(file)}
  const options=specialOptions[draft.modeId]||[]
  const toggleSpecial=(option:string)=>setDraft(current=>{
    if(current.specialRules.includes(option)) return {...current,specialRules:current.specialRules.filter(x=>x!==option)}
    const group=option.startsWith('首图：')?'首图：':option.startsWith('选图：')?'选图：':['鏖战','巅峰鏖战'].includes(option)?'决胜规则':''
    const remaining=group?current.specialRules.filter(x=>group==='决胜规则'?!['鏖战','巅峰鏖战'].includes(x):!x.startsWith(group)):current.specialRules
    return {...current,specialRules:[...remaining,option]}
  })
  const params=modeParamKeys[draft.modeId]||[]
  return <div className="match-editor"><div className="setup-options"><label>玩法<select value={draft.modeId} onChange={e=>setDraft({...draft,modeId:e.target.value,specialRules:[]})}>{modes.map(x=><option key={x}>{x}</option>)}</select></label><label className="display-grand"><span><strong>显示大分</strong><small>适用于多大局比赛</small></span><button type="button" className={`switch ${draft.showGrandScore?'on':''}`} onClick={()=>setDraft({...draft,showGrandScore:!draft.showGrandScore})}><span/></button></label></div>{params.length>0&&<div className="mode-params"><div><strong>玩法参数</strong><span>填写本玩法需要的数值</span></div><div>{params.map(key=><label key={key}>{paramLabels[key]}<input type="number" min="1" value={draft.modeParams[key]||1} onChange={e=>setDraft({...draft,modeParams:{...draft.modeParams,[key]:Math.max(1,Number(e.target.value)||1)}})}/></label>)}</div></div>}{options.length>0&&<><button className="optional-rules-toggle" onClick={()=>setShowRules(!showRules)}>{showRules?'收起可选规则':`设置可选规则${draft.specialRules.length?`（已选 ${draft.specialRules.length} 项）`:''}`}</button>{showRules&&<div className="special-rule-picker simple"><div>{options.map(option=><button key={option} className={draft.specialRules.includes(option)?'active':''} onClick={()=>toggleSpecial(option)}>{draft.specialRules.includes(option)&&<Check size={13}/>} {option}</button>)}</div></div>}</>}<div className="form-row-title"><div><strong>参赛队伍或选手</strong><span>至少 2 方，最多 6 方</span></div><button className="btn small ghost" onClick={add} disabled={draft.competitors.length>=6}><Plus size={14}/> 添加参赛方</button></div><div className="competitor-cards">{draft.competitors.map((c,index)=><div className="competitor-card" key={c.id}><label className="avatar-upload">{c.avatar?<SmartImage src={c.avatar}/>:<><ImagePlus/><span>队徽 / 头像</span></>}<input type="file" accept="image/*" onChange={e=>upload(c.id,e.target.files?.[0])}/></label><div className="competitor-fields"><label>名称<input value={c.name} onChange={e=>patchCompetitor(c.id,{name:e.target.value})}/></label><label>识别色<div className="color-input"><input type="color" value={c.color} onChange={e=>patchCompetitor(c.id,{color:e.target.value})}/><span>{c.color}</span></div></label></div><button className="icon-btn remove-competitor" disabled={draft.competitors.length<=2} onClick={()=>setDraft({...draft,competitors:draft.competitors.filter(x=>x.id!==c.id)})}><X size={16}/></button><span className="competitor-index">{String(index+1).padStart(2,'0')}</span></div>)}</div><button className="btn primary confirm-match" disabled={draft.competitors.length<2||draft.competitors.some(x=>!x.name.trim())} onClick={()=>onConfirm(draft)}><Check size={16}/> 开始第 {draft.completedGrandRounds.length+1} 大局</button></div>
}

function TrackPicker({data,onPick,onClose}:{data:AppData;onPick:(id:string)=>void;onClose:()=>void}){const random=()=>{const pool=data.tracks.filter(x=>x.pools.peak);const source=pool.length?pool:data.tracks;if(source.length)onPick(source[Math.floor(Math.random()*source.length)].id)};return <Modal title="选择本局赛道" onClose={onClose} wide><div className="picker-head"><p>可按名称、星级、标签和王图筛选</p><button className="btn primary" onClick={random}><Dices size={16}/> 从巅峰赛图池随机</button></div><TrackSelector tracks={data.tracks} onSelect={track=>onPick(track.id)}/></Modal>}

function RoundEditor({round,competitors,save,onClose}:{round:RoundResult;competitors:Competitor[];save:(r:RoundResult)=>void;onClose:()=>void}){const [draft,setDraft]=useState(round);return <Modal title="录入小局比分" onClose={onClose}><div className="stack-form"><p className="form-help">填写这一小局的得分，保存后会自动累计到当前大局总分。</p><div className="round-edit-scores">{competitors.map(c=><div key={c.id}><span><i style={{background:c.color}}/>{c.name}</span><div><button onClick={()=>setDraft({...draft,scores:{...draft.scores,[c.id]:(draft.scores[c.id]||0)-1}})}><Minus/></button><input type="number" value={draft.scores[c.id]||0} onChange={e=>setDraft({...draft,scores:{...draft.scores,[c.id]:Number(e.target.value)}})}/><button onClick={()=>setDraft({...draft,scores:{...draft.scores,[c.id]:(draft.scores[c.id]||0)+1}})}><Plus/></button></div></div>)}</div><label>备注（可选）<textarea rows={3} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} placeholder="排名、特殊情况…"/></label><button className="btn primary full" onClick={()=>save(draft)}><Save size={16}/> 保存小局比分</button></div></Modal>}

function ArchiveModal({archives,onRestore,onDelete,onClose}:{archives:SavedMatch[];onRestore:(m:SavedMatch)=>void;onDelete:(id:string)=>void;onClose:()=>void}){return <Modal title="已保存的比赛战绩" onClose={onClose} wide><div className="archive-list">{archives.length?archives.map(item=>{const score=totals(item.match);return <div className="archive-row" key={item.id}><div className="archive-icon"><Archive/></div><div className="archive-info"><strong>{item.name}</strong><span>{item.match.competitors.map(c=>`${c.name} ${score[c.id]||0}`).join(' · ')} · {item.match.rounds.length} 局</span></div><time>{new Date(item.savedAt).toLocaleString('zh-CN')}</time><button className="btn small ghost" onClick={()=>onRestore(item)}><RotateCcw size={14}/> 恢复到计分台</button><button className="icon-btn danger" onClick={()=>onDelete(item.id)}><Trash2 size={15}/></button></div>}):<div className="empty-state"><Archive/><h3>还没有保存的战绩</h3><p>比赛进行后，点击计分台顶部的“保存战绩”</p></div>}</div></Modal>}
