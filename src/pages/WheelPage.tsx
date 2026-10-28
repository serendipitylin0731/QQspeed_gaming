import { useMemo, useState } from 'react'
import { Check, ChevronDown, CircleOff, History, RotateCcw, Save, SlidersHorizontal, Sparkles, Trash2 } from 'lucide-react'
import type { AppData, WheelConfig, WheelFilter } from '../types'
import { SmartImage } from '../components/SmartImage'

const defaultFilter: WheelFilter = { base:'all',stars:[3,4,5,6,7],excludeSailing:false,excludeNostalgia:false,customTrackIds:[],noRepeat:true }
const colors=['#6d5dfc','#2ab6ff','#12c9a5','#f5a84b','#ef6577','#9e66ef','#3dd2e2','#7098ff']

export function WheelPage({ data, update }: { data: AppData; update: (fn: (d: AppData) => AppData) => void }) {
  const [filter,setFilter]=useState<WheelFilter>(defaultFilter)
  const [drawn,setDrawn]=useState<string[]>([])
  const [result,setResult]=useState<string>('')
  const [spinning,setSpinning]=useState(false)
  const [rotation,setRotation]=useState(0)
  const [name,setName]=useState('我的图池')
  const candidates=useMemo(()=>data.tracks.filter(t=>filter.stars.includes(t.star)&&(filter.base==='all'||filter.base==='custom'&&filter.customTrackIds.includes(t.id)||filter.base!=='custom'&&t.pools[filter.base])&&(!filter.excludeSailing||!t.pools.sailing)&&(!filter.excludeNostalgia||!t.pools.nostalgia)),[data.tracks,filter])
  const available=filter.noRepeat?candidates.filter(t=>!drawn.includes(t.id)):candidates
  const visible=candidates.slice(0,24)
  const gradient=visible.length?`conic-gradient(${visible.map((_,i)=>`${colors[i%colors.length]} ${i/visible.length*100}% ${(i+1)/visible.length*100}%`).join(',')})`:'#20283a'
  function spin(){if(!available.length||spinning)return;setSpinning(true);const pick=available[Math.floor(Math.random()*available.length)];setRotation(x=>x+1440+Math.random()*320);setTimeout(()=>{setResult(pick.id);if(filter.noRepeat)setDrawn(x=>[...x,pick.id]);setSpinning(false)},1900)}
  function save(){if(data.wheels.length>=100)return;const item:WheelConfig={id:`wheel-${Date.now()}`,name:name.trim()||'未命名配置',filter,drawnIds:drawn,createdAt:new Date().toISOString()};update(d=>({...d,wheels:[item,...d.wheels]}))}
  function load(w:WheelConfig){setFilter(w.filter);setDrawn(w.drawnIds);setName(w.name);setResult('')}
  const resultTrack=data.tracks.find(x=>x.id===result)
  return <div className="page-enter">
    <div className="page-title"><div><span className="eyebrow">RANDOM PICKER</span><h1>随机转盘</h1><p>组合图池条件，公平抽取下一张赛道</p></div><div className="title-actions"><label className="compact-name"><input value={name} onChange={e=>setName(e.target.value)}/></label><button className="btn ghost" onClick={save} disabled={data.wheels.length>=100}><Save size={16}/> 保存配置</button></div></div>
    <div className="wheel-layout">
      <aside className="filter-panel panel"><div className="section-head"><h2><SlidersHorizontal size={18}/> 抽取范围</h2><button className="icon-btn" onClick={()=>{setFilter(defaultFilter);setDrawn([])}} title="重置条件"><RotateCcw size={16}/></button></div>
        <label className="form-label">基础图池</label><div className="base-options">{([['all','全图池'],['peak','巅峰赛'],['league','联赛'],['custom','自定义']] as const).map(([v,l])=><button className={filter.base===v?'active':''} key={v} onClick={()=>setFilter({...filter,base:v})}>{l}</button>)}</div>
        <label className="form-label">星级筛选</label><div className="star-options">{[1,2,3,4,5,6,7].map(x=><button key={x} className={filter.stars.includes(x)?'active':''} onClick={()=>setFilter({...filter,stars:filter.stars.includes(x)?filter.stars.filter(s=>s!==x):[...filter.stars,x]})}>{x}<small>★</small></button>)}</div>
        <label className="check-row"><button className={filter.excludeNostalgia?'checked':''} onClick={()=>setFilter({...filter,excludeNostalgia:!filter.excludeNostalgia})}>{filter.excludeNostalgia&&<Check size={12}/>}</button><span>排除怀旧赛道</span></label>
        <label className="check-row"><button className={filter.excludeSailing?'checked':''} onClick={()=>setFilter({...filter,excludeSailing:!filter.excludeSailing})}>{filter.excludeSailing&&<Check size={12}/>}</button><span>排除航海赛道</span></label>
        <label className="switch-row"><div><strong>不重复抽取</strong><small>记录并排除已抽取地图</small></div><button className={filter.noRepeat?'on':''} onClick={()=>setFilter({...filter,noRepeat:!filter.noRepeat})}><span/></button></label>
        {filter.base==='custom'&&<div className="custom-pick-list"><label className="form-label">选择地图（{filter.customTrackIds.length}）</label>{data.tracks.slice(0,40).map(t=><button key={t.id} className={filter.customTrackIds.includes(t.id)?'active':''} onClick={()=>setFilter({...filter,customTrackIds:filter.customTrackIds.includes(t.id)?filter.customTrackIds.filter(x=>x!==t.id):[...filter.customTrackIds,t.id]})}><span>{t.name}</span>{filter.customTrackIds.includes(t.id)&&<Check size={13}/>}</button>)}</div>}
      </aside>
      <section className="wheel-stage panel">
        <div className="wheel-meta"><span><strong>{candidates.length}</strong> 张候选</span>{filter.noRepeat&&<span>剩余 <strong>{available.length}</strong> 张</span>}<button onClick={()=>{setDrawn([]);setResult('')}}><RotateCcw size={14}/> 重置状态</button></div>
        <div className="wheel-wrap"><div className="wheel-pointer"/><div className="wheel" style={{background:gradient,transform:`rotate(${rotation}deg)`}}><div className="wheel-center"><img src="./logo.svg"/></div></div></div>
        <div className="wheel-legend">{visible.slice(0,8).map((t,i)=><span key={t.id}><i style={{background:colors[i%colors.length]}}/>{t.name}</span>)}{visible.length>8&&<small>另有 {visible.length-8} 张候选赛道</small>}</div>
        {resultTrack?<div className="wheel-result"><SmartImage src={resultTrack.coverHorizontal}/><div><small>本次抽取</small><strong>{resultTrack.name}</strong><span>{resultTrack.star} 星赛道</span></div></div>:<div className="wheel-placeholder"><Sparkles/><span>{available.length?'点击按钮，决定下一张赛道':'候选地图已抽完，请重置状态'}</span></div>}
        <button className="spin-button" disabled={!available.length||spinning} onClick={spin}><Sparkles size={20}/>{spinning?'转盘旋转中…':'开始抽取'}</button>
      </section>
      <aside className="saved-panel panel"><div className="section-head"><h2><History size={18}/> 已存配置</h2><span>{data.wheels.length}/100</span></div>{data.wheels.length?data.wheels.map(w=><div className="saved-row" key={w.id}><button onClick={()=>load(w)}><strong>{w.name}</strong><small>{w.filter.base==='all'?'全图池':w.filter.base==='peak'?'巅峰赛':w.filter.base==='league'?'联赛':'自定义'} · 已抽 {w.drawnIds.length}</small></button><button className="icon-btn danger" onClick={()=>update(d=>({...d,wheels:d.wheels.filter(x=>x.id!==w.id)}))}><Trash2 size={15}/></button></div>):<div className="empty-compact"><CircleOff/><p>暂无保存的转盘</p><span>设定条件后保存，抽取状态也会一并保留</span></div>}</aside>
    </div>
  </div>
}
