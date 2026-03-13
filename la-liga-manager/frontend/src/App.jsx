import { useState, useEffect, useCallback } from 'react'
import Dashboard from './components/Dashboard'
import Squad from './components/Squad'
import Standings from './components/Standings'
import Fixtures from './components/Fixtures'
import TransferMarket from './components/TransferMarket'
import Tactics from './components/Tactics'
import SeasonEnd from './components/SeasonEnd'

const API = '/api'

export function api(path, opts = {}) {
  return fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  }).then(async r => {
    if (!r.ok) {
      const body = await r.json().catch(() => ({}))
      throw new Error(body.detail || `HTTP ${r.status}`)
    }
    return r.json()
  })
}

const TABS = [
  { id: 'dashboard',  label: '⚽ Dashboard' },
  { id: 'squad',      label: '👥 Squad' },
  { id: 'tactics',    label: '🗒 Tactics' },
  { id: 'standings',  label: '🏆 Standings' },
  { id: 'fixtures',   label: '📅 Fixtures' },
  { id: 'transfers',  label: '💶 Transfers' },
]

const PHASE_LABELS = {
  pre_season:       { label: 'Pre-Season — Transfer Window Open', color: '#2ea043' },
  matchday_pending: { label: 'Ready to Simulate Matchday',        color: '#d29922' },
  mid_season:       { label: 'Mid-Season',                        color: '#58a6ff' },
  winter_window:    { label: 'Winter Transfer Window',            color: '#9e6a03' },
  season_end:       { label: 'Season Complete',                   color: '#8957e5' },
}

export default function App() {
  const [tab, setTab]           = useState('dashboard')
  const [gameState, setGS]      = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const refreshGS = useCallback(() => {
    api('/gamestate')
      .then(setGS)
      .catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    api('/gamestate')
      .then(gs => { setGS(gs); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  // Auto-redirect to season_end tab
  useEffect(() => {
    if (gameState?.phase === 'season_end' && tab !== 'dashboard') {
      // leave user on current tab
    }
  }, [gameState?.phase])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  if (error) return (
    <div className="page" style={{ paddingTop: 40 }}>
      <div className="error-box">
        <strong>Could not connect to the API.</strong><br />
        {error}<br /><br />
        Make sure the backend is running:<br />
        <code style={{ fontSize: 12, color: '#aaa' }}>cd backend && uvicorn app.main:app --reload</code>
      </div>
    </div>
  )

  const phase = PHASE_LABELS[gameState?.phase] || { label: gameState?.phase, color: '#7d8590' }

  return (
    <div>
      {/* Nav */}
      <nav className="nav">
        <div className="nav-brand">⚽ La Liga</div>
        {TABS.map(t => (
          <div
            key={t.id}
            className={`nav-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', paddingRight: 8, color: '#7d8590', fontSize: 12 }}>
          {gameState?.season_year} · MD {gameState?.current_matchday}
        </div>
      </nav>

      {/* Phase banner */}
      <div className="phase-banner" style={{ background: phase.color + '22', borderBottom: `1px solid ${phase.color}44` }}>
        <span style={{ color: phase.color }}>●</span>
        <span style={{ color: phase.color }}>{phase.label}</span>
        {gameState?.transfer_window_open && (
          <span className="badge badge-green">Transfer Window Open</span>
        )}
      </div>

      {/* Page content */}
      {tab === 'dashboard'  && <Dashboard gameState={gameState} onRefresh={refreshGS} />}
      {tab === 'squad'      && <Squad gameState={gameState} />}
      {tab === 'tactics'    && <Tactics gameState={gameState} onRefresh={refreshGS} />}
      {tab === 'standings'  && <Standings />}
      {tab === 'fixtures'   && <Fixtures gameState={gameState} />}
      {tab === 'transfers'  && <TransferMarket gameState={gameState} onRefresh={refreshGS} />}
    </div>
  )
}
