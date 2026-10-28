import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Crown, Dices, Flag, Minus, Plus, RotateCcw, Save, Settings2, Trophy, X } from 'lucide-react'
import { Modal } from '../components/Modal'
import type { AppData, Competitor, RoundResult } from '../types'

const modes=['1v1单挑抢n','1v1绝活单挑赛','多人混战滴血赛','多人混战积分赛','多人混战抢n','kvk接力抢n','kvk组队滴血赛','kvk组队积分赛','kvk组队计时赛','kvk组队抢n']
const colors=['#42a5ff','#ff8a47','#9d6cff','#1ecb9b','#ef6680','#e3bd42']

export function MatchPage({ data, update }: { data: AppData; update: (fn: (d: AppData) => AppData) => void }) {
  const match=data.match
  const [setup,setSetup]=useState(false)
  const [picking,setPicking]=useState(false)
  const [editingRound,setEditingRound]=useState<RoundResult|null>(null)
  const patch=(value:Partial<typeof match>)=>update(d=>({...d,match:{...d.match,...value}}))
  function score(id:string,delta:number){patch({competitors:match.competitors.map(x=>x.id===id?{...x,score:x.score+delta}:x)})}
  function addRound(trackId:string){const round:RoundResult={id:`round-${Date.now()}`,trackId,scores:Object.fromEntries(match.competitors.map(x=>[x.id,0])),notes:''};patch({rounds:[...match.rounds,round],activeRound:match.rounds.length});setPicking(false);setEditingRound(round)}
  function updateRound(round:RoundResult){patch({rounds:match.rounds.map(x=>x.id===round.id?round:x)});setEditingRound(null)}
  function nextGrand(){patch({competitors:match.competitors.map(x=>({...x,grandScore:x.grandScore+(x.score===Math.max(...match.competitors.map(y=>y.score))?1:0),score:0})),rounds:[],activeRound:0})}
  return <div className="match-page page-enter">
    <div className="match-topbar panel">
      <div className="mode-block"><span className="eyebrow">CURRENT MODE</span><button onClick={()=>setSetup(true)}><strong>{match.modeId}</strong><Settings2 size={15}/></button></div>
      <div className="scoreboard">{match.competitors.map((team,index)=><div className="team-score" key={team.id} style={{'--team-color':team.color} as React.CSSProperties}><div className="team-label"><span className="team-dot"/><input value={team.name} onChange={e=>patch({competitors:match.competitors.map(x=>x.id===team.id?{...x,name:e.target.value}:x)})}/><small>大分 {team.grandScore}</small></div><div className="score-controls"><button onClick={()=>score(team.id,-1)}><Minus/></button><strong>{team.score}</strong><button onClick={()=>score(team.id,1)}><Plus/></button></div>{index<match.competitors.length-1&&<span className="versus">VS</span>}</div>)}</div>
      <div className="match-actions"><button className="btn ghost" onClick={nextGrand}><Crown size={16}/> 结束大局</button><button className="btn primary" onClick={()=>setPicking(true)}><Plus size={17}/> 下一局</button></div>
    </div>
    <div className="rounds-header"><div><span className="eyebrow">MATCH HISTORY</span><h2>赛道战绩</h2></div><p>共 {match.rounds.length} 局 · 点击卡片修改本局记录</p></div>
    <div className="round-scroll">
      {match.rounds.map((round,index)=>{const track=data.tracks.find(x=>x.id===round.trackId);return <button className={`round-card ${match.activeRound===index?'active':''}`} key={round.id} onClick={()=>{patch({activeRound:index});setEditingRound(round)}}>
        <div className="round-image">{track&&<img src={track.coverVertical||track.coverHorizontal}/>}<span className="round-number">{String(index+1).padStart(2,'0')}</span><div className="round-overlay"><span>{track?.star} ★</span><strong>{track?.name||'未知赛道'}</strong></div></div>
        <div className="round-scores">{match.competitors.map(c=><div key={c.id}><span><i style={{background:c.color}}/>{c.name}</span><strong className={(round.scores[c.id]||0)>0?'positive':(round.scores[c.id]||0)<0?'negative':''}>{(round.scores[c.id]||0)>0?'+':''}{round.scores[c.id]||0}</strong></div>)}</div>
      </button>})}
      <button className="round-add" onClick={()=>setPicking(true)}><span><Plus/></span><strong>选择赛道</strong><small>手动选择或随机抽取</small></button>
    </div>
    {match.rounds.length>0&&<div className="history-nav"><button disabled={match.activeRound===0} onClick={()=>patch({activeRound:Math.max(0,match.activeRound-1)})}><ChevronLeft/></button><span>{match.activeRound+1} / {match.rounds.length}</span><button disabled={match.activeRound===match.rounds.length-1} onClick={()=>patch({activeRound:Math.min(match.rounds.length-1,match.activeRound+1)})}><ChevronRight/></button></div>}
    {!match.rounds.length&&<div className="match-empty"><div className="flag-orbit"><Flag/></div><h2>准备好第一局了吗？</h2><p>选择一张赛道，比赛结束后在赛道卡片上录入每队得分。</p><button className="btn primary" onClick={()=>setPicking(true)}><Dices size={17}/> 随机选择首图</button></div>}
    {setup&&<MatchSetup match={match} patch={patch} onClose={()=>setSetup(false)}/>} 
    {picking&&<TrackPicker data={data} onPick={addRound} onClose={()=>setPicking(false)}/>} 
    {editingRound&&<RoundEditor round={editingRound} competitors={match.competitors} save={updateRound} onClose={()=>setEditingRound(null)}/>} 
  </div>
}

function MatchSetup({match,patch,onClose}:{match:AppData['match'];patch:(p:Partial<AppData['match']>)=>void;onClose:()=>void}){
  function add(){if(match.competitors.length>=6)return;const n=match.competitors.length;patch({competitors:[...match.competitors,{id:`side-${Date.now()}`,name:`选手 ${n+1}`,grandScore:0,score:0,color:colors[n%colors.length]}]})}
  return <Modal title="对局设置" onClose={onClose}><div className="stack-form"><label>玩法模式<select value={match.modeId} onChange={e=>patch({modeId:e.target.value})}>{modes.map(x=><option key={x}>{x}</option>)}</select></label><div className="competitor-editor"><div className="form-row-title"><span>参赛方（2–6）</span><button className="text-btn" onClick={add} disabled={match.competitors.length>=6}><Plus size={14}/> 添加</button></div>{match.competitors.map((x,i)=><div key={x.id} className="competitor-row"><input type="color" value={x.color} onChange={e=>patch({competitors:match.competitors.map(c=>c.id===x.id?{...c,color:e.target.value}:c)})}/><input value={x.name} onChange={e=>patch({competitors:match.competitors.map(c=>c.id===x.id?{...c,name:e.target.value}:c)})}/><button className="icon-btn" disabled={match.competitors.length<=2} onClick={()=>patch({competitors:match.competitors.filter(c=>c.id!==x.id)})}><X size={16}/></button></div>)}</div><button className="btn primary full" onClick={onClose}><Check size={16}/> 完成设置</button></div></Modal>
}

function TrackPicker({data,onPick,onClose}:{data:AppData;onPick:(id:string)=>void;onClose:()=>void}){
  const [query,setQuery]=useState('');const list=data.tracks.filter(x=>!query||x.name.includes(query)).slice(0,60)
  const random=()=>{const pool=data.tracks.filter(x=>x.pools.peak);const source=pool.length?pool:data.tracks;if(source.length)onPick(source[Math.floor(Math.random()*source.length)].id)}
  return <Modal title="选择本局赛道" onClose={onClose} wide><div className="picker-head"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索赛道名称" autoFocus/><button className="btn primary" onClick={random}><Dices size={16}/> 从巅峰赛图池随机</button></div><div className="track-picker-grid">{list.map(t=><button key={t.id} onClick={()=>onPick(t.id)}><img src={t.coverHorizontal}/><span><strong>{t.name}</strong><small>{t.star} ★</small></span></button>)}</div></Modal>
}

function RoundEditor({round,competitors,save,onClose}:{round:RoundResult;competitors:Competitor[];save:(r:RoundResult)=>void;onClose:()=>void}){
  const [draft,setDraft]=useState(round)
  return <Modal title="录入本局战绩" onClose={onClose}><div className="stack-form"><div className="round-edit-scores">{competitors.map(c=><div key={c.id}><span><i style={{background:c.color}}/>{c.name}</span><div><button onClick={()=>setDraft({...draft,scores:{...draft.scores,[c.id]:(draft.scores[c.id]||0)-1}})}><Minus/></button><input type="number" value={draft.scores[c.id]||0} onChange={e=>setDraft({...draft,scores:{...draft.scores,[c.id]:Number(e.target.value)}})}/><button onClick={()=>setDraft({...draft,scores:{...draft.scores,[c.id]:(draft.scores[c.id]||0)+1}})}><Plus/></button></div></div>)}</div><label>本局备注<textarea rows={3} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} placeholder="排名、胜负关系或特殊情况…"/></label><button className="btn primary full" onClick={()=>save(draft)}><Save size={16}/> 保存战绩</button></div></Modal>
}
