import { useState, useEffect } from 'react'
import { api } from '../App'

export default function Standings() {
  const [standings, setStand] = useState([])
  const [gameState, setGS]    = useState(null)

  useEffect(() => {
    api('/gamestate').then(gs => {
      setGS(gs)
      return api('/league/standings')
    }).then(setStand).catch(() => {})
  }, [])

  const getRowStyle = (i) => {
    if (i < 4)  return { background: 'rgba(46,160,67,0.05)', borderLeft: '3px solid #2ea043' }
    if (i < 6)  return { background: 'rgba(88,166,255,0.05)', borderLeft: '3px solid #58a6ff' }
    if (i >= 17) return { background: 'rgba(248,81,73,0.05)', borderLeft: '3px solid #f85149' }
    return {}
  }

  return (
    <div className="page">
      <div className="flex-between mb-16">
        <div className="page-title">La Liga Standings {gameState?.season_year}</div>
        <div className="flex gap-8 text-sm">
          <span style={{ color: '#2ea043' }}>■ UEFA Champions League</span>
          <span style={{ color: '#58a6ff' }}>■ UEFA Europa League</span>
          <span style={{ color: '#f85149' }}>■ Relegation</span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Club</th>
              <th title="Played" style={{ textAlign: 'center' }}>P</th>
              <th title="Wins" style={{ textAlign: 'center' }}>W</th>
              <th title="Draws" style={{ textAlign: 'center' }}>D</th>
              <th title="Losses" style={{ textAlign: 'center' }}>L</th>
              <th title="Goals For" style={{ textAlign: 'center' }}>GF</th>
              <th title="Goals Against" style={{ textAlign: 'center' }}>GA</th>
              <th title="Goal Difference" style={{ textAlign: 'center' }}>GD</th>
              <th title="Points" style={{ textAlign: 'center' }}>Pts</th>
              <th>Form</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const gd = s.goals_for - s.goals_against
              const isUser = s.club_id === gameState?.user_club_id
              return (
                <tr
                  key={s.club_id}
                  style={{
                    ...getRowStyle(i),
                    fontWeight: isUser ? 700 : undefined,
                    background: isUser
                      ? 'rgba(217,26,33,0.08)'
                      : getRowStyle(i).background,
                  }}
                >
                  <td style={{ textAlign: 'center', fontWeight: 700,
                    color: i < 4 ? '#2ea043' : i >= 17 ? '#f85149' : 'var(--text-muted)' }}>
                    {i + 1}
                  </td>
                  <td>
                    {s.club_name}
                    {isUser && <span className="badge badge-red" style={{ marginLeft: 8 }}>YOU</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>{s.played}</td>
                  <td style={{ textAlign: 'center', color: '#2ea043' }}>{s.wins}</td>
                  <td style={{ textAlign: 'center', color: '#d29922' }}>{s.draws}</td>
                  <td style={{ textAlign: 'center', color: '#f85149' }}>{s.losses}</td>
                  <td style={{ textAlign: 'center' }}>{s.goals_for}</td>
                  <td style={{ textAlign: 'center' }}>{s.goals_against}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600,
                    color: gd > 0 ? '#2ea043' : gd < 0 ? '#f85149' : 'var(--text-muted)' }}>
                    {gd > 0 ? '+' : ''}{gd}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 800, fontSize: 15, color: '#f7a01d' }}>
                    {s.points}
                  </td>
                  <td>
                    <FormBadges wins={s.wins} draws={s.draws} losses={s.losses} played={s.played} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-muted mt-12">
        Matchday {gameState?.current_matchday} / 38 — Season {gameState?.season_year}
      </div>
    </div>
  )
}

function FormBadges({ wins, draws, losses, played }) {
  if (played === 0) return <span className="text-muted text-sm">—</span>
  // Simple last-5 approximation (not stored per game, just show ratio)
  const total = wins + draws + losses
  const ratio = wins / total
  const formStr = ratio > 0.6 ? 'W' : ratio > 0.35 ? 'D' : 'L'
  return (
    <span className={`badge ${formStr === 'W' ? 'badge-green' : formStr === 'L' ? 'badge-red' : 'badge-yellow'}`}>
      {wins}W-{draws}D-{losses}L
    </span>
  )
}
