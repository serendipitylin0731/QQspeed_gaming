import { useMemo, useState } from 'react'
import { Check, Clock3, Crown, Filter, ImageOff, Plus, Search, Star, Upload, Video } from 'lucide-react'
import { Modal } from '../components/Modal'
import type { AppData, PoolKey, Track } from '../types'

const poolLabels: Record<PoolKey, string> = { sailing: '航海', nostalgia: '怀旧', peak: '巅峰赛', league: '联赛' }
const emptyPools = { sailing: false, nostalgia: false, peak: false, league: false }

export function TrackLibrary({ data, update }: { data: AppData; update: (fn: (d: AppData) => AppData) => void }) {
  const [search, setSearch] = useState('')
  const [star, setStar] = useState(0)
  const [pool, setPool] = useState<'all' | PoolKey>('all')
  const [kingOnly, setKingOnly] = useState(false)
  const [selected, setSelected] = useState<Track | null>(null)
  const [showBatch, setShowBatch] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(() => data.tracks.filter((track) =>
    (!search.trim() || track.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) &&
    (!star || track.star === star) && (pool === 'all' || track.pools[pool]) && (!kingOnly || track.king)
  ), [data.tracks, search, star, pool, kingOnly])

  function toggleKing(id: string) {
    update((current) => {
      const target = current.tracks.find((x) => x.id === id)
      if (!target?.king && current.tracks.filter((x) => x.king).length >= 15) return current
      return { ...current, tracks: current.tracks.map((x) => x.id === id ? { ...x, king: !x.king } : x) }
    })
  }

  return <div className="page-enter">
    <div className="page-title"><div><span className="eyebrow">TRACK DATABASE</span><h1>赛道仓库</h1><p>管理图池、王图与个人最佳纪录</p></div><div className="title-actions"><button className="btn ghost" onClick={() => setShowBatch(true)}><Filter size={16}/> 图池批量管理</button><button className="btn primary" onClick={() => setShowAdd(true)}><Plus size={17}/> 添加赛道</button></div></div>
    <div className="toolbar panel-lite">
      <label className="search-box"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="输入赛道名称（支持部分搜索）"/><kbd>{filtered.length}</kbd></label>
      <select value={star} onChange={(e) => setStar(Number(e.target.value))}><option value="0">全部星级</option>{[1,2,3,4,5,6,7].map(x=><option key={x} value={x}>{x} 星</option>)}</select>
      <select value={pool} onChange={(e) => setPool(e.target.value as typeof pool)}><option value="all">全部图池</option>{Object.entries(poolLabels).map(([k,v])=><option key={k} value={k}>{v}图池</option>)}</select>
      <button className={`toggle-button ${kingOnly ? 'active' : ''}`} onClick={() => setKingOnly(!kingOnly)}><Crown size={16} fill={kingOnly ? 'currentColor' : 'none'}/> 只看王图</button>
    </div>
    <div className="track-grid">
      {filtered.map((track) => <article className="track-card" key={track.id}>
        <button className="card-image" onClick={() => setSelected(track)}>{track.coverHorizontal ? <img src={track.coverHorizontal} alt=""/> : <ImageOff/>}<span className="star-badge"><Star size={12} fill="currentColor"/>{track.star}</span>{track.record && <span className="record-badge"><Clock3 size={12}/> {track.record.time}</span>}</button>
        <button className={`king-button ${track.king ? 'active' : ''}`} title="设为王图" onClick={() => toggleKing(track.id)}><Crown size={17} fill={track.king ? 'currentColor' : 'none'}/></button>
        <div className="card-body"><h3>{track.name}</h3><div className="pool-chips">{(Object.keys(poolLabels) as PoolKey[]).filter((k) => track.pools[k]).map(k=><span key={k} className={k}>{poolLabels[k]}</span>)}{!Object.values(track.pools).some(Boolean) && <span className="muted-chip">未分组</span>}</div></div>
      </article>)}
    </div>
    {!filtered.length && <div className="empty-state"><Search size={34}/><h3>没有找到赛道</h3><p>试试更短的名称或清除筛选条件</p></div>}
    {selected && <TrackDetail track={data.tracks.find(x=>x.id===selected.id)!} update={update} onClose={() => setSelected(null)}/>} 
    {showBatch && <BatchPool data={data} update={update} onClose={() => setShowBatch(false)}/>} 
    {showAdd && <AddTrack update={update} onClose={() => setShowAdd(false)}/>} 
  </div>
}

function TrackDetail({ track, update, onClose }: { track: Track; update: (fn: (d: AppData) => AppData) => void; onClose: () => void }) {
  const [time, setTime] = useState(track.record?.time || '')
  const [code, setCode] = useState(track.record?.videoCode || '')
  const patchTrack = (patch: Partial<Track>) => update(d => ({ ...d, tracks: d.tracks.map(x => x.id === track.id ? { ...x, ...patch } : x) }))
  return <Modal title={track.name} onClose={onClose} wide><div className="detail-layout">
    <div className="detail-visual"><img src={track.coverHorizontal} alt=""/><div className="detail-stars">{Array.from({length: track.star}).map((_,i)=><Star key={i} size={16} fill="currentColor"/>)}</div><p>{track.description || '暂无赛道介绍。'}</p></div>
    <div className="detail-form"><h3>图池归属</h3><div className="pool-toggle-grid">{(Object.keys(poolLabels) as PoolKey[]).map(k=><button key={k} className={track.pools[k] ? 'active' : ''} onClick={() => patchTrack({ pools: { ...track.pools, [k]: !track.pools[k] } })}><span>{track.pools[k] && <Check size={13}/>}</span>{poolLabels[k]}图池</button>)}</div>
      <h3>个人纪录</h3><label>最佳成绩<input value={time} onChange={e=>setTime(e.target.value)} placeholder="例如 01:27.64"/></label><label>录像口令码 / 链接<div className="input-with-icon"><Video size={15}/><input value={code} onChange={e=>setCode(e.target.value)} placeholder="输入口令码或视频链接"/></div></label>
      <button className="upload-zone"><Upload size={19}/><span>上传录像二维码</span><small>支持 PNG / JPG（本地保存）</small></button>
      <button className="btn primary full" onClick={() => { patchTrack({ record: { time, videoCode: code, updatedAt: new Date().toISOString() } }); onClose() }}>保存修改</button>
    </div>
  </div></Modal>
}

function BatchPool({ data, update, onClose }: { data: AppData; update: (fn: (d: AppData) => AppData) => void; onClose: () => void }) {
  const [names, setNames] = useState('')
  const [pool, setPool] = useState<PoolKey>('peak')
  const [operation, setOperation] = useState<'add'|'remove'>('add')
  const parsed = names.split(/[、,，\n]/).map(x=>x.trim()).filter(Boolean)
  const matched = data.tracks.filter(x=>parsed.includes(x.name))
  function apply() { update(d=>({...d, tracks:d.tracks.map(t=>parsed.includes(t.name)?{...t,pools:{...t.pools,[pool]:operation==='add'}}:t)})); onClose() }
  return <Modal title="图池批量管理" onClose={onClose}><div className="stack-form"><p className="form-help">输入多个赛道名称，用顿号、逗号或换行分隔；名称需完全匹配。</p><label>赛道名称<textarea rows={6} value={names} onChange={e=>setNames(e.target.value)} placeholder="秋名山、十一城、云端长城"/></label><div className="two-cols"><label>目标图池<select value={pool} onChange={e=>setPool(e.target.value as PoolKey)}>{Object.entries(poolLabels).map(([k,v])=><option value={k} key={k}>{v}图池</option>)}</select></label><label>操作<select value={operation} onChange={e=>setOperation(e.target.value as 'add'|'remove')}><option value="add">加入图池</option><option value="remove">移出图池</option></select></label></div><div className="match-preview">已识别 <strong>{matched.length}</strong> / {parsed.length} 张：{matched.map(x=>x.name).join('、') || '—'}</div><button className="btn primary full" disabled={!matched.length} onClick={apply}>应用修改</button></div></Modal>
}

function AddTrack({ update, onClose }: { update: (fn: (d: AppData) => AppData) => void; onClose: () => void }) {
  const [name,setName]=useState(''); const [star,setStar]=useState(5); const [cover,setCover]=useState('')
  function add(){ if(!name.trim())return; update(d=>({...d,tracks:[{id:`custom-${Date.now()}`,name:name.trim(),star,coverHorizontal:cover,coverVertical:cover,pools:{...emptyPools},king:false},...d.tracks]}));onClose() }
  return <Modal title="添加自定义赛道" onClose={onClose}><div className="stack-form"><label>赛道名称<input value={name} onChange={e=>setName(e.target.value)} autoFocus/></label><label>星级<select value={star} onChange={e=>setStar(Number(e.target.value))}>{[1,2,3,4,5,6,7].map(x=><option key={x}>{x}</option>)}</select></label><label>封面图片地址<input value={cover} onChange={e=>setCover(e.target.value)} placeholder="https://…"/></label><button className="btn primary full" onClick={add}>添加赛道</button></div></Modal>
}
