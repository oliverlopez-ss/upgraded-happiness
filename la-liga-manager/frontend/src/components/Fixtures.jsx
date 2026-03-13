import { useState, useEffect } from 'react'
import { api } from '../App'

function FixtureRow({ fixture, userClubId }) {
  const r = fixture.result
  const isHome = fixture.home_club_id === userClubId
  const isAway = fixture.away_club_id === userClubId
  const involved = isHome || isAway

  let resultBadge = null
  if (r) {
    const userGoals = isHome ? r.home_goals : r.away_goals
    const oppGoals  = isHome ? r.away_goals : r.home_goals
    if (userGoals > oppGoals) resultBadge = <span className="badge badge-green">W</span>
    else if (userGoals < oppGoals) resultBadge = <span className="badge badge-red">L</span>
    else resultBadge = <span className="badge badge-yellow">D</span>
  }

  return (
    <tr style={{
      fontWeight: involved ? 700 : undefined,
      background: involved ? 'rgba(217,26,33,0.05)' : undefined,
    }}>
      <td className="text-muted">{fixture.matchday}</td>
      <td style={{ textAlign: 'right' }}>{fixture.home_club_id.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</td>
      <td style={{ textAlign: 'center', fontWeight: 800, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
        {r ? `${r.home_goals}–${r.away_goals}` : <span className="text-muted">vs</span>}
      </td>
      <td>{fixture.away_club_id.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</td>
      <td>{resultBadge}</td>
      <td>
        {fixture.played
          ? <span className="badge badge-gray">FT</span>
          : <span className="text-muted text-sm">—</span>}
      </td>
    </tr>
  )
}

export default function Fixtures({ gameState }) {
  const [fixtures, setFixtures] = useState([])
  const [mdFilter, setMdFilter] = useState('ALL')

  useEffect(() => {
    api('/season/fixtures').then(setFixtures).catch(() => {})
  }, [])

  const matchdays = [...new Set(fixtures.map(f => f.matchday))].sort((a,b)=>a-b)

  const filtered = mdFilter === 'ALL'
    ? fixtures
    : fixtures.filter(f => f.matchday === Number(mdFilter))

  return (
    <div className="page">
      <div className="flex-between mb-16">
        <div className="page-title">Fixtures</div>
        <select value={mdFilter} onChange={e => setMdFilter(e.target.value)}>
          <option value="ALL">All Matchdays</option>
          {matchdays.map(md => (
            <option key={md} value={md}>Matchday {md}</option>
          ))}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 60 }}>MD</th>
              <th style={{ textAlign: 'right' }}>Home</th>
              <th style={{ textAlign: 'center', width: 80 }}>Score</th>
              <th>Away</th>
              <th style={{ width: 60 }}></th>
              <th style={{ width: 60 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <FixtureRow key={f.id} fixture={f} userClubId={gameState?.user_club_id} />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 20 }}>
                No fixtures.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-muted text-sm mt-8">{filtered.length} fixtures</div>
    </div>
  )
}
