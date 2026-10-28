import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Clock3, Crown, Filter, Plus, Search, Star, Upload, Video } from 'lucide-react'
import { Modal } from '../components/Modal'
import { SmartImage } from '../components/SmartImage'
import type { AppData, PoolKey, Track } from '../types'

const poolLabels: Record<PoolKey, string> = { sailing: '航海', nostalgia: '怀旧', peak: '巅峰赛', league: '联赛' }
const emptyPools = { sailing: false, nostalgia: false, peak: false, league: false }

export function TrackLibrary({ data, update }: { data: AppData; update: (fn: (d: AppData) => AppData) => void }) {
  const [search, setSearch] = useState('')
  const [star, setStar] = useState(0)
  const [pool, setPool] = useState<'all' | PoolKey>('all')
  const [kingOnly, setKingOnly] = useState(false)
  const [selected, setSelected] = useState<Track | null>(null)
  const [view, setView] = useState<'library'|'pools'|'detail'>('library')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(() => data.tracks.filter((track) =>
    (!search.trim() || track.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) &&
    (!star || track.star === star) && (pool === 'all' || track.pools[pool]) && (!kingOnly || track.king)
  ).sort((a,b)=>a.star-b.star || a.name.localeCompare(b.name,'zh-CN')), [data.tracks, search, star, pool, kingOnly])

  function toggleKing(id: string) {
    update((current) => {
      const target = current.tracks.find((x) => x.id === id)
      if (!target?.king && current.tracks.filter((x) => x.king).length >= 15) return current
      return { ...current, tracks: current.tracks.map((x) => x.id === id ? { ...x, king: !x.king } : x) }
    })
  }

  if(view==='pools') return <PoolManagement data={data} update={update} onBack={()=>setView('library')}/>
  if(view==='detail'&&selected) return <TrackDetailPage track={data.tracks.find(x=>x.id===selected.id)!} update={update} onBack={()=>{setSelected(null);setView('library')}}/>
  return <div className="page-enter">
    <div className="page-title"><div><span className="eyebrow">TRACK DATABASE</span><h1>赛道仓库</h1><p>管理图池、王图与个人最佳纪录</p></div><div className="title-actions"><button className="btn ghost" onClick={() => setView('pools')}><Filter size={16}/> 图池管理</button><button className="btn primary" onClick={() => setShowAdd(true)}><Plus size={17}/> 添加赛道</button></div></div>
    <div className="toolbar panel-lite">
      <label className="search-box"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="输入赛道名称（支持部分搜索）"/><kbd>{filtered.length}</kbd></label>
      <select value={star} onChange={(e) => setStar(Number(e.target.value))}><option value="0">全部星级</option>{[1,2,3,4,5,6,7].map(x=><option key={x} value={x}>{x} 星</option>)}</select>
      <select value={pool} onChange={(e) => setPool(e.target.value as typeof pool)}><option value="all">全部图池</option>{Object.entries(poolLabels).map(([k,v])=><option key={k} value={k}>{v}图池</option>)}</select>
      <button className={`toggle-button ${kingOnly ? 'active' : ''}`} onClick={() => setKingOnly(!kingOnly)}><Crown size={16} fill={kingOnly ? 'currentColor' : 'none'}/> 只看王图</button>
    </div>
    <div className="track-grid">
      {filtered.map((track) => <article className="track-card" key={track.id}>
        <button className="card-image" onClick={() => {setSelected(track);setView('detail')}}><SmartImage src={track.coverHorizontal}/><span className="star-badge"><Star size={12} fill="currentColor"/>{track.star}</span>{track.record && <span className="record-badge"><Clock3 size={12}/> {track.record.time}</span>}</button>
        <button className={`king-button ${track.king ? 'active' : ''}`} title="设为王图" onClick={() => toggleKing(track.id)}><Crown size={17} fill={track.king ? 'currentColor' : 'none'}/></button>
        <div className="card-body"><h3>{track.name}</h3><div className="pool-chips">{(Object.keys(poolLabels) as PoolKey[]).filter((k) => track.pools[k]).map(k=><span key={k} className={k}>{poolLabels[k]}</span>)}{!Object.values(track.pools).some(Boolean) && <span className="muted-chip">未分组</span>}</div></div>
      </article>)}
    </div>
    {!filtered.length && <div className="empty-state"><Search size={34}/><h3>没有找到赛道</h3><p>试试更短的名称或清除筛选条件</p></div>}
    {showAdd && <AddTrack update={update} onClose={() => setShowAdd(false)}/>} 
  </div>
}

function TrackDetailPage({ track, update, onBack }: { track: Track; update: (fn: (d: AppData) => AppData) => void; onBack: () => void }) {
  const [time, setTime] = useState(track.record?.time || '')
  const [code, setCode] = useState(track.record?.videoCode || '')
  const patchTrack = (patch: Partial<Track>) => update(d => ({ ...d, tracks: d.tracks.map(x => x.id === track.id ? { ...x, ...patch } : x) }))
  return <div className="track-detail-page page-enter">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16}/> 返回赛道仓库</button>
    <div className="page-title detail-title"><div><span className="eyebrow">TRACK PROFILE</span><h1>{track.name}</h1><div className="detail-stars">{Array.from({length: track.star}).map((_,i)=><Star key={i} size={15} fill="currentColor"/>)}<span>{track.star} 星赛道</span></div></div><button className={`btn ${track.king?'primary':'ghost'}`} onClick={()=>update(d=>{const total=d.tracks.filter(x=>x.king).length;if(!track.king&&total>=15)return d;return {...d,tracks:d.tracks.map(x=>x.id===track.id?{...x,king:!x.king}:x)}})}><Crown size={16} fill={track.king?'currentColor':'none'}/>{track.king?'已设为王图':'设为王图'}</button></div>
    <div className="track-detail-layout">
      <section className="panel detail-media-panel"><div className="detail-cover"><SmartImage src={track.coverHorizontal}/></div><div className="detail-description"><span className="eyebrow">TRACK INTRO</span><h2>赛道介绍</h2><p>{track.description || '暂无赛道介绍。'}</p></div></section>
      <section className="panel detail-control-panel"><div className="detail-section"><span className="eyebrow">POOL MEMBERSHIP</span><h2>图池归属</h2><div className="pool-toggle-grid">{(Object.keys(poolLabels) as PoolKey[]).map(k=><button key={k} className={track.pools[k] ? 'active' : ''} onClick={() => patchTrack({ pools: { ...track.pools, [k]: !track.pools[k] } })}><span>{track.pools[k] && <Check size={13}/>}</span>{poolLabels[k]}图池</button>)}</div></div>
        <div className="detail-section record-section"><span className="eyebrow">PERSONAL RECORD</span><h2>个人纪录</h2><div className="record-fields"><label>最佳成绩<input value={time} onChange={e=>setTime(e.target.value)} placeholder="例如 01:27.64"/></label><label>录像口令码 / 链接<div className="input-with-icon"><Video size={15}/><input value={code} onChange={e=>setCode(e.target.value)} placeholder="输入口令码或视频链接"/></div></label></div><button className="upload-zone"><Upload size={19}/><span>上传录像二维码</span><small>支持 PNG / JPG（本地保存）</small></button></div>
        <div className="detail-savebar"><span>修改会自动保存在本机</span><button className="btn primary" onClick={() => { patchTrack({ record: time||code ? { time, videoCode: code, updatedAt: new Date().toISOString() } : undefined }); onBack() }}>保存并返回</button></div>
      </section>
    </div>
  </div>
}

function PoolManagement({ data, update, onBack }: { data: AppData; update: (fn: (d: AppData) => AppData) => void; onBack: () => void }) {
  const [pool, setPool] = useState<PoolKey>('peak')
  const [search, setSearch] = useState('')
  const [names, setNames] = useState('')
  const tracks = [...data.tracks].sort((a,b)=>Number(b.pools[pool])-Number(a.pools[pool]) || a.star-b.star || a.name.localeCompare(b.name,'zh-CN'))
    .filter(track=>!search || track.name.includes(search))
  const included = data.tracks.filter(track=>track.pools[pool]).length
  const toggle = (id:string) => update(d=>({...d,tracks:d.tracks.map(t=>t.id===id?{...t,pools:{...t.pools,[pool]:!t.pools[pool]}}:t)}))
  const applyNames = (value:boolean) => {
    const parsed=names.split(/[、,，\n]/).map(x=>x.trim()).filter(Boolean)
    update(d=>({...d,tracks:d.tracks.map(t=>parsed.includes(t.name)?{...t,pools:{...t.pools,[pool]:value}}:t)}))
  }
  return <div className="pool-page page-enter">
    <div className="page-title"><div><button className="back-link" onClick={onBack}><ArrowLeft size={16}/> 返回赛道仓库</button><span className="eyebrow">POOL MANAGEMENT</span><h1>图池管理</h1><p>查看一个完整图池，并直接调整每张赛道的归属</p></div><div className="pool-total"><strong>{included}</strong><span>张赛道已加入</span></div></div>
    <div className="pool-tabs panel-lite">{(Object.keys(poolLabels) as PoolKey[]).map(key=><button key={key} className={pool===key?'active':''} onClick={()=>setPool(key)}><span>{poolLabels[key]}图池</span><small>{data.tracks.filter(t=>t.pools[key]).length} 张</small></button>)}</div>
    <div className="pool-workspace">
      <section className="panel pool-list-panel"><div className="pool-list-head"><div><h2>{poolLabels[pool]}图池</h2><p>已加入的赛道排在前面，点击右侧开关即可调整</p></div><label className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索赛道"/><kbd>{tracks.length}</kbd></label></div>
        <div className="pool-track-list">{tracks.map(track=><div className={`pool-track-row ${track.pools[pool]?'included':''}`} key={track.id}><SmartImage src={track.coverHorizontal}/><div><strong>{track.name}</strong><span>{track.star} 星赛道</span></div><span className="pool-status">{track.pools[pool]?'已加入':'未加入'}</span><button className={`switch ${track.pools[pool]?'on':''}`} onClick={()=>toggle(track.id)} aria-label={`切换${track.name}`}><span/></button></div>)}</div>
      </section>
      <aside className="panel pool-batch-panel"><span className="eyebrow">BATCH EDIT</span><h2>按名称批量调整</h2><p>使用顿号、逗号或换行分隔。赛道名称需要完全一致。</p><textarea rows={9} value={names} onChange={e=>setNames(e.target.value)} placeholder="秋名山、十一城、云端长城"/><div className="batch-buttons"><button className="btn primary" disabled={!names.trim()} onClick={()=>applyNames(true)}><Plus size={15}/> 批量加入</button><button className="btn ghost" disabled={!names.trim()} onClick={()=>applyNames(false)}>批量移出</button></div></aside>
    </div>
  </div>
}

function AddTrack({ update, onClose }: { update: (fn: (d: AppData) => AppData) => void; onClose: () => void }) {
  const [name,setName]=useState(''); const [star,setStar]=useState(5); const [cover,setCover]=useState('')
  function add(){ if(!name.trim())return; update(d=>({...d,tracks:[{id:`custom-${Date.now()}`,name:name.trim(),star,coverHorizontal:cover,coverVertical:cover,pools:{...emptyPools},king:false},...d.tracks]}));onClose() }
  return <Modal title="添加自定义赛道" onClose={onClose}><div className="stack-form"><label>赛道名称<input value={name} onChange={e=>setName(e.target.value)} autoFocus/></label><label>星级<select value={star} onChange={e=>setStar(Number(e.target.value))}>{[1,2,3,4,5,6,7].map(x=><option key={x}>{x}</option>)}</select></label><label>封面图片地址<input value={cover} onChange={e=>setCover(e.target.value)} placeholder="https://…"/></label><button className="btn primary full" onClick={add}>添加赛道</button></div></Modal>
}
