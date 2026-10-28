import { useState } from 'react'
import { Layout, type PageId } from './components/Layout'
import { useAppData } from './hooks/useAppData'
import { Dashboard } from './pages/Dashboard'
import { TrackLibrary } from './pages/TrackLibrary'
import { CarLibrary } from './pages/CarLibrary'
import { WheelPage } from './pages/WheelPage'
import { MatchPage } from './pages/MatchPage'
import { RulesPage } from './pages/RulesPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  const requested = new URLSearchParams(location.search).get('page') as PageId | null
  const [page, setPage] = useState<PageId>(requested && ['home','tracks','cars','wheel','match','rules','settings'].includes(requested) ? requested : 'home')
  const [collapsed, setCollapsed] = useState(false)
  const store = useAppData()
  const common = { data: store.data, update: store.update }
  return <Layout page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed}>
    {page === 'home' && <Dashboard {...common} setPage={setPage}/>} 
    {page === 'tracks' && <TrackLibrary {...common}/>} 
    {page === 'cars' && <CarLibrary {...common}/>} 
    {page === 'wheel' && <WheelPage {...common}/>} 
    {page === 'match' && <MatchPage {...common}/>} 
    {page === 'rules' && <RulesPage/>} 
    {page === 'settings' && <SettingsPage {...store}/>} 
  </Layout>
}
