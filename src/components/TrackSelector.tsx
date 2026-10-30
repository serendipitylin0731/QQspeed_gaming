import { Crown, Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PoolKey, Track } from '../types'
import { SmartImage } from './SmartImage'

const labels:Record<PoolKey,string>={sailing:'航海',nostalgia:'怀旧',peak:'巅峰赛',league:'联赛'}

export function TrackConfirmation({track,action='选择',onConfirm,onCancel}:{track:Track;action?:string;onConfirm:()=>void;onCancel:()=>void}){
  return createPortal(<div className="track-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="track-confirm-title"><div className="track-confirm-card"><h2 id="track-confirm-title">确认{action}赛道？</h2><SmartImage src={track.coverHorizontal}/><strong>{track.name}</strong><p>{track.star} 星赛道</p><div><button type="button" className="btn ghost" onClick={onCancel}>取消</button><button type="button" className="btn primary" onClick={onConfirm}>确认{action}</button></div></div></div>,document.body)
}

export function TrackSelector({tracks,selectedIds=[],onSelect,multi=false,compact=false}:{tracks:Track[];selectedIds?:string[];onSelect:(track:Track)=>void;multi?:boolean;compact?:boolean}){
  const [search,setSearch]=useState(''),[star,setStar]=useState(0),[pool,setPool]=useState<'all'|PoolKey>('all'),[kingOnly,setKingOnly]=useState(false)
  const [pending,setPending]=useState<Track|null>(null)
  const filtered=useMemo(()=>tracks.filter(track=>(!search||track.name.includes(search))&&(!star||track.star===star)&&(pool==='all'||track.pools[pool])&&(!kingOnly||track.king)).sort((a,b)=>a.star-b.star||a.name.localeCompare(b.name,'zh-CN')),[tracks,search,star,pool,kingOnly])
  return <div className={`track-selector ${compact?'compact':''}`}><div className="selector-filters"><label className="search-box"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索地图名称"/><kbd>{filtered.length}</kbd></label><select value={star} onChange={e=>setStar(Number(e.target.value))}><option value="0">全部星级</option>{[1,2,3,4,5,6,7].map(x=><option key={x} value={x}>{x} 星</option>)}</select><select value={pool} onChange={e=>setPool(e.target.value as 'all'|PoolKey)}><option value="all">全部标签</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><button className={kingOnly?'active':''} onClick={()=>setKingOnly(!kingOnly)}><Crown size={14} fill={kingOnly?'currentColor':'none'}/> 王图</button></div><div className="selector-results">{filtered.map(track=>{const selected=selectedIds.includes(track.id);return <button key={track.id} className={selected?'selected':''} onClick={()=>setPending(track)}><SmartImage src={track.coverHorizontal}/><span><strong>{track.name}</strong><small><Star size={10} fill="currentColor"/>{track.star}{Object.entries(labels).filter(([key])=>track.pools[key as PoolKey]).slice(0,2).map(([,label])=>` · ${label}`)}</small></span>{multi&&<i>{selected?'已选择':'添加'}</i>}</button>})}{!filtered.length&&<div className="selector-empty">没有符合条件的地图</div>}</div>{pending&&<TrackConfirmation track={pending} action={multi&&selectedIds.includes(pending.id)?'移除':'选择'} onCancel={()=>setPending(null)} onConfirm={()=>{onSelect(pending);setPending(null)}}/>}</div>
}
