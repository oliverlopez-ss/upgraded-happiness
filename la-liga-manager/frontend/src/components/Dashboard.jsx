import { useState, useEffect } from 'react'
import { api } from '../App'

function StatRow({ label, value, color }) {
  return (
    <div className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span className="text-muted">{label}</span>
      <span style={{ color: color || 'var(--text)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function MatchCard({ result, userClubId }) {
  const isHome = result.home_club_id === userClubId
  const isAway = result.away_club_id === userClubId
  const userGoals = isHome ? result.home_goals : result.away_goals
  const oppGoals  = isHome ? result.away_goals : result.home_goals
  const won  = userGoals > oppGoals
  const lost = userGoals < oppGoals
  const color = won ? '#2ea043' : lost ? '#f85149' : '#d29922'

  return (
    <div className="card mt-8" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex-between mb-8">
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          {result.home_club_name} <span className="score">{result.home_goals}–{result.away_goals}</span> {result.away_club_name}
        </span>
        <span className="badge" style={{ background: color + '22', color }}>
          {won ? 'WIN' : lost ? 'LOSS' : 'DRAW'}
        </span>
      </div>
      {result.events?.filter(e => e.event_type === 'goal').slice(0, 4).map((e, i) => (
        <div key={i} className="text-sm text-muted">
          ⚽ {e.player_name} {e.minute}'
        </div>
      ))}
      {result.match_summary && (
        <div className="text-sm text-muted mt-8" style={{ whiteSpace: 'pre-line', fontStyle: 'italic' }}>
          {result.match_summary.split('\n')[0]}
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ gameState, onRefresh }) {
  const [club, setClub]       = useState(null)
  const [standings, setStand] = useState([])
  const [lastResults, setLast] = useState([])
  const [simulating, setSim]  = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!gameState) return
    api(`/clubs/${gameState.user_club_id}`).then(setClub).catch(() => {})
    api('/league/standings').then(setStand).catch(() => {})
  }, [gameState])

  useEffect(() => {
    if (!gameState?.last_matchday_results?.length) return
    // Fetch fixtures for last matchday
    const md = gameState.current_matchday
    if (md > 0) {
      api(`/season/fixtures/${md}`).then(fixtures => {
        const results = fixtures
          .filter(f => f.played && f.result)
          .map(f => f.result)
        setLast(results)
      }).catch(() => {})
    }
  }, [gameState?.current_matchday])

  const myStanding = standings.find(s => s.club_id === gameState?.user_club_id)
  const myRank     = standings.findIndex(s => s.club_id === gameState?.user_club_id) + 1

  async function handleAction(action) {
    setError(null)
    try {
      if (action === 'simulate_matchday') {
        setSim(true)
        await api('/season/simulate', { method: 'POST' })
        setSim(false)
      } else if (action === 'start_season') {
        await api('/gamestate/start_season', { method: 'POST' })
      } else if (action === 'advance_matchday') {
        await api('/gamestate/advance_matchday', { method: 'POST' })
      } else if (action === 'close_window') {
        await api('/gamestate/close_winter_window', { method: 'POST' })
      } else if (action === 'start_new_season') {
        await api('/gamestate/start_new_season', { method: 'POST' })
      }
      onRefresh()
      // Reload standings & club after action
      api('/league/standings').then(setStand).catch(() => {})
      api(`/clubs/${gameState.user_club_id}`).then(setClub).catch(() => {})
    } catch (e) {
      setError(e.message)
      setSim(false)
    }
  }

  const ACTION_LABELS = {
    start_season:       { label: 'Kick Off Season', cls: 'primary' },
    simulate_matchday:  { label: simulating ? 'Simulating...' : `▶ Simulate Matchday ${(gameState?.current_matchday||0)+1}`, cls: 'primary' },
    advance_matchday:   { label: `Prepare Matchday ${(gameState?.current_matchday||0)+1}`, cls: 'success' },
    close_window:       { label: 'Close Transfer Window', cls: '' },
    start_new_season:   { label: '🆕 Start New Season', cls: 'primary' },
  }

  const showActions = (gameState?.available_actions || [])
    .filter(a => ACTION_LABELS[a])

  return (
    <div className="page">
      <div className="flex-between mb-16">
        <div>
          <div className="page-title">{club?.name || 'Loading...'}</div>
          <div className="text-muted">{club?.stadium} · {club?.city}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: myRank <= 4 ? '#2ea043' : myRank >= 18 ? '#f85149' : 'var(--text)' }}>
            #{myRank || '—'}
          </div>
          <div className="text-muted text-sm">La Liga</div>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="grid-3 mb-16">
        {/* Club stats */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Club Finances</div>
          <StatRow label="Transfer Budget" value={`€${club?.budget?.toFixed(1)}M`} color="#2ea043" />
          <StatRow label="Wage Budget" value={`€${club?.wage_budget?.toFixed(0)}k/wk`} />
          <StatRow label="Formation" value={club?.current_formation} />
          <StatRow label="Squad Size" value={club?.squad?.length} />
        </div>

        {/* Season stats */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Season {gameState?.season_year}</div>
          <StatRow label="Matchday" value={`${gameState?.current_matchday} / 38`} />
          {myStanding && <>
            <StatRow label="Points" value={myStanding.points} color="#f7a01d" />
            <StatRow label="Record" value={`${myStanding.wins}W ${myStanding.draws}D ${myStanding.losses}L`} />
            <StatRow label="Goals" value={`${myStanding.goals_for} : ${myStanding.goals_against}`} />
          </>}
        </div>

        {/* Actions */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Actions</div>
          {showActions.map(action => (
            <button
              key={action}
              className={ACTION_LABELS[action]?.cls || ''}
              disabled={simulating}
              style={{ width: '100%', marginBottom: 8 }}
              onClick={() => handleAction(action)}
            >
              {ACTION_LABELS[action]?.label || action}
            </button>
          ))}
          {showActions.length === 0 && (
            <span className="text-muted text-sm">No actions available in this phase.</span>
          )}
        </div>
      </div>

      {/* Last matchday results */}
      {lastResults.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>
            Matchday {gameState?.current_matchday} Results
          </div>
          <div className="grid-2">
            {lastResults.map(r => (
              <MatchCard key={r.fixture_id} result={r} userClubId={gameState?.user_club_id} />
            ))}
          </div>
        </div>
      )}

      {/* Mini standings */}
      {standings.length > 0 && (
        <div className="mt-16">
          <div style={{ fontWeight: 700, marginBottom: 10 }}>League Standings</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Club</th><th>P</th>
                  <th>W</th><th>D</th><th>L</th>
                  <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr key={s.club_id}
                    style={{
                      background: s.club_id === gameState?.user_club_id ? 'rgba(217,26,33,0.1)' : undefined,
                      fontWeight: s.club_id === gameState?.user_club_id ? 700 : undefined,
                    }}>
                    <td style={{ color: i < 4 ? '#2ea043' : i >= 17 ? '#f85149' : 'var(--text-muted)', fontWeight: 700 }}>
                      {i + 1}
                    </td>
                    <td>{s.club_name}</td>
                    <td>{s.played}</td>
                    <td style={{ color: '#2ea043' }}>{s.wins}</td>
                    <td>{s.draws}</td>
                    <td style={{ color: '#f85149' }}>{s.losses}</td>
                    <td>{s.goals_for}</td>
                    <td>{s.goals_against}</td>
                    <td style={{ color: s.goals_for - s.goals_against >= 0 ? '#2ea043' : '#f85149' }}>
                      {s.goals_for - s.goals_against > 0 ? '+' : ''}{s.goals_for - s.goals_against}
                    </td>
                    <td style={{ fontWeight: 700, color: '#f7a01d' }}>{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
