import { ArrowRight, CarFront, ChevronRight, Clock3, Crown, Database, LibraryBig, Play, Sparkles, Star, Trophy } from 'lucide-react'
import type { AppData } from '../types'
import type { PageId } from '../components/Layout'
import { SmartImage } from '../components/SmartImage'

export function Dashboard({ data, setPage }: { data: AppData; update: (fn: (d: AppData) => AppData) => void; setPage: (page: PageId) => void }) {
  const records = data.tracks.filter((x) => x.record)
  const kings = data.tracks.filter((x) => x.king)
  const recent = records.slice(0, 4)
  return <div className="dashboard page-enter">
    <section className="hero-panel">
      <div className="hero-copy">
        <span className="eyebrow"><Sparkles size={14}/> READY TO RACE</span>
        <h1>今晚，跑哪张图？</h1>
        
        <div className="hero-actions">
          <button className="btn primary" onClick={() => setPage('wheel')}><Play size={17} fill="currentColor"/> 开始抽图</button>
          <button className="btn ghost" onClick={() => setPage('match')}><Trophy size={17}/> 打开计分台</button>
        </div>
      </div>
      <div className="hero-orbit" aria-hidden="true">
        <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
        <img src="./logo.svg" alt=""/><span className="speed-line a"/><span className="speed-line b"/><span className="speed-line c"/>
      </div>
    </section>

    <section className="stat-grid">
      <button className="stat-card cyan" onClick={() => setPage('tracks')}><div className="stat-icon"><LibraryBig/></div><div><span>收录赛道</span><strong>{data.tracks.length}</strong><small>张地图</small></div><ChevronRight/></button>
      <button className="stat-card violet" onClick={() => setPage('cars')}><div className="stat-icon"><CarFront/></div><div><span>赛车图鉴</span><strong>{data.cars.length}</strong><small>辆赛车</small></div><ChevronRight/></button>
      <button className="stat-card amber" onClick={() => setPage('tracks')}><div className="stat-icon"><Crown/></div><div><span>我的王图</span><strong>{kings.length}</strong><small>/ 15 张</small></div><ChevronRight/></button>
      <button className="stat-card green" onClick={() => setPage('tracks')}><div className="stat-icon"><Clock3/></div><div><span>个人纪录</span><strong>{records.length}</strong><small>条记录</small></div><ChevronRight/></button>
    </section>

    <section className="home-columns">
      <div className="panel">
        <div className="section-head"><div><span className="eyebrow">RECENT RECORDS</span><h2>最近纪录</h2></div><button className="text-btn" onClick={() => setPage('tracks')}>查看全部 <ArrowRight size={15}/></button></div>
        <div className="record-list">
          {recent.length ? recent.map((track) => <div className="record-row" key={track.id}>
            <SmartImage src={track.coverHorizontal}/><div className="record-info"><strong>{track.name}</strong><span>{track.star} 星赛道 · {new Date(track.record!.updatedAt).toLocaleDateString('zh-CN')}</span></div>
            <div className="record-time"><small>个人最佳</small><strong>{track.record!.time}</strong></div>
          </div>) : <div className="empty-small">还没有纪录，去赛道仓库添加第一条吧。</div>}
        </div>
      </div>
      <div className="panel quick-panel">
        <div className="section-head"><div><span className="eyebrow">QUICK START</span><h2>快捷操作</h2></div></div>
        <button onClick={() => setPage('wheel')}><span className="quick-icon purple"><Sparkles/></span><div><strong>随机地图</strong></div><ChevronRight/></button>
        <button onClick={() => setPage('match')}><span className="quick-icon blue"><Trophy/></span><div><strong>新建对局</strong></div><ChevronRight/></button>
        <button onClick={() => setPage('settings')}><span className="quick-icon green"><Database/></span><div><strong>同步官网</strong><small>{data.lastSync ? `上次 ${new Date(data.lastSync).toLocaleDateString('zh-CN')}` : '尚未同步'}</small></div><ChevronRight/></button>
      </div>
    </section>

    <section className="king-strip panel">
      <div className="section-head"><div><span className="eyebrow">KING TRACKS</span><h2><Crown size={20}/> 我的王图</h2></div><span className="muted">点击星标可在赛道仓库管理，最多 15 张</span></div>
      <div className="king-cards">
        {kings.slice(0, 6).map((track) => <button key={track.id} onClick={() => setPage('tracks')}><SmartImage src={track.coverHorizontal}/><span><strong>{track.name}</strong><small>{Array.from({length: Math.min(track.star, 6)}).map((_,i)=><Star key={i} size={11} fill="currentColor"/>)}</small></span><Crown className="crown" size={18} fill="currentColor"/></button>)}
        {kings.length === 0 && <div className="empty-small">还未设置王图</div>}
      </div>
    </section>
  </div>
}
