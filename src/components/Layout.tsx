import type { ReactNode } from 'react'
import { CarFront, ChevronRight, Database, Gauge, LayoutDashboard, LibraryBig, Menu, Settings, ShieldCheck, Sparkles, Trophy, X } from 'lucide-react'

export type PageId = 'home' | 'tracks' | 'cars' | 'wheel' | 'match' | 'rules' | 'settings'

const nav = [
  { id: 'home', label: '总览', icon: LayoutDashboard },
  { id: 'tracks', label: '赛道仓库', icon: LibraryBig },
  { id: 'cars', label: '赛车图鉴', icon: CarFront },
  { id: 'wheel', label: '随机转盘', icon: Sparkles },
  { id: 'match', label: '赛事计分台', icon: Trophy },
  { id: 'rules', label: '玩法规则', icon: ShieldCheck },
  { id: 'settings', label: '数据管理', icon: Database },
] as const

interface Props {
  page: PageId
  setPage: (page: PageId) => void
  collapsed: boolean
  setCollapsed: (value: boolean) => void
  children: ReactNode
  syncMessage?: string
}

export function Layout({ page, setPage, collapsed, setCollapsed, children, syncMessage }: Props) {
  const current = nav.find((item) => item.id === page)!
  return <div className={`app-shell ${collapsed ? 'nav-collapsed' : ''}`}>
    <aside className="sidebar">
      <div className="brand">
        <img src="./logo.svg" alt="" />
        {!collapsed && <div><strong>极速仓库</strong><span>RACING VAULT</span></div>}
      </div>
      <nav>
        {nav.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)} title={label}>
          <Icon size={19}/>{!collapsed && <span>{label}</span>}{!collapsed && page === id && <ChevronRight size={15}/>} 
        </button>)}
      </nav>
      <div className="sidebar-foot">
        <div className="mini-status"><span className="online-dot"/>{!collapsed && <span>本地数据已连接</span>}</div>
        {!collapsed && <div className="storage-hint"><Settings size={13}/> 自动保存已开启</div>}
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <button className="icon-btn" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <Menu size={19}/> : <X size={19}/>}</button>
        <div className="crumb"><Gauge size={17}/><span>极速仓库</span><ChevronRight size={14}/><strong>{current.label}</strong></div>
        {syncMessage && <div className="sync-pill">{syncMessage}</div>}
        <div className="window-drag" />
      </header>
      <div className="page-content">{children}</div>
    </main>
  </div>
}
