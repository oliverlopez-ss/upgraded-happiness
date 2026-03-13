import { useState, useEffect } from 'react'
import { api } from '../App'

export default function SeasonEnd({ gameState, onRefresh }) {
  const [awards, setAwards] = useState([])

  useEffect(() => {
    api('/gamestate/awards').then(setAwards).catch(() => {})
  }, [])

  async function startNewSeason() {
    await api('/gamestate/start_new_season', { method: 'POST' })
    onRefresh()
  }

  return (
    <div className="page" style={{ maxWidth: 600, margin: '40px auto' }}>
      <div className="text-center mb-16">
        <div style={{ fontSize: 48 }}>🏆</div>
        <div className="page-title">Season {gameState?.season_year} Complete!</div>
        <div className="text-muted">La Liga has concluded. Here are the final honours.</div>
      </div>

      <div className="card mb-16">
        {awards.map((a, i) => (
          <div key={i} style={{
            padding: '12px 0',
            borderBottom: i < awards.length - 1 ? '1px solid var(--border)' : 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 700, color: '#f7a01d' }}>{a.award}</div>
              <div style={{ fontWeight: 600 }}>{a.player_name || a.club_name}</div>
            </div>
            <span className="badge badge-yellow">{a.value}</span>
          </div>
        ))}
      </div>

      <button className="primary" style={{ width: '100%', padding: '12px' }} onClick={startNewSeason}>
        🆕 Start Season {(gameState?.season_year || 2024) + 1}
      </button>
    </div>
  )
}
