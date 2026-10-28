import { useMemo, useState } from 'react'
import { CarFront, Check, ImageOff, Layers3, Plus, Search } from 'lucide-react'
import { Modal } from '../components/Modal'
import type { AppData, Car } from '../types'

export function CarLibrary({ data, update }: { data: AppData; update: (fn: (d: AppData) => AppData) => void }) {
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState('全部')
  const [selected, setSelected] = useState<Car | null>(null)
  const grades = useMemo(() => ['全部', ...Array.from(new Set(data.cars.map((x) => x.grade))).sort()], [data.cars])
  const cars = useMemo(() => data.cars.filter(x => (!search.trim() || x.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) && (grade === '全部' || x.grade === grade)), [data.cars, search, grade])
  return <div className="page-enter">
    <div className="page-title"><div><span className="eyebrow">VEHICLE ARCHIVE</span><h1>赛车图鉴</h1><p>按等级浏览，管理每辆赛车的皮肤</p></div><div className="count-display"><CarFront/><strong>{data.cars.length}</strong><span>辆已收录</span></div></div>
    <div className="toolbar panel-lite">
      <label className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="输入赛车名称（支持部分搜索）"/><kbd>{cars.length}</kbd></label>
      <div className="segmented">{grades.map(x=><button key={x} className={grade===x?'active':''} onClick={()=>setGrade(x)}>{x}</button>)}</div>
    </div>
    <div className="car-grid">{cars.map(car=>{
      const skin=car.skins.find(x=>x.id===car.selectedSkinId)||car.skins[0]
      return <article className="car-card" key={car.id} onClick={()=>setSelected(car)}>
        <div className="car-art">{skin?.cover?<img src={skin.cover} alt=""/>:<ImageOff/>}<span className="grade-badge">{car.grade}</span><span className="skin-count"><Layers3 size={13}/>{car.skins.length}</span></div>
        <div className="car-meta"><div><h3>{car.name}</h3><span>{skin?.name || '原皮'}</span></div><button className="round-arrow">›</button></div>
      </article>})}</div>
    {!cars.length&&<div className="empty-state"><Search size={34}/><h3>没有找到赛车</h3><p>换一个名称或等级试试</p></div>}
    {selected&&<CarDetail car={data.cars.find(x=>x.id===selected.id)!} update={update} onClose={()=>setSelected(null)}/>} 
  </div>
}

function CarDetail({ car, update, onClose }: { car: Car; update: (fn: (d: AppData) => AppData) => void; onClose: () => void }) {
  const [adding,setAdding]=useState(false); const [name,setName]=useState(''); const [cover,setCover]=useState('')
  const current=car.skins.find(x=>x.id===car.selectedSkinId)||car.skins[0]
  function patch(patch:Partial<Car>){update(d=>({...d,cars:d.cars.map(x=>x.id===car.id?{...x,...patch}:x)}))}
  function add(){if(!name.trim())return; const skin={id:`skin-${Date.now()}`,name:name.trim(),cover,cutout:cover};patch({skins:[...car.skins,skin],selectedSkinId:skin.id});setAdding(false)}
  return <Modal title={car.name} onClose={onClose} wide><div className="car-detail">
    <div className="car-showcase">{current?.cutout?<img src={current.cutout} alt=""/>:<ImageOff/>}<div className="showcase-glow"/><span className="large-grade">{car.grade}</span><div><strong>{current?.name}</strong><small>当前展示皮肤</small></div></div>
    <div className="skin-picker"><div className="skin-title"><div><span className="eyebrow">PAINT COLLECTION</span><h3>皮肤收藏</h3></div><button className="btn small ghost" onClick={()=>setAdding(!adding)}><Plus size={15}/> 添加皮肤</button></div>
      {adding&&<div className="add-skin"><input value={name} onChange={e=>setName(e.target.value)} placeholder="皮肤名称"/><input value={cover} onChange={e=>setCover(e.target.value)} placeholder="封面图片地址"/><button className="btn primary small" onClick={add}>添加</button></div>}
      <div className="skin-grid">{car.skins.map(skin=><button key={skin.id} className={skin.id===car.selectedSkinId?'active':''} onClick={()=>patch({selectedSkinId:skin.id})}><div>{skin.cover?<img src={skin.cover} alt=""/>:<ImageOff/>}{skin.id===car.selectedSkinId&&<span className="selected-check"><Check size={13}/></span>}</div><strong>{skin.name}</strong></button>)}</div>
      <p className="car-description">{car.description||'这辆赛车尚无详细介绍。你可以为它添加并切换不同皮肤，外部图鉴会始终显示当前选中的皮肤。'}</p>
    </div>
  </div></Modal>
}
