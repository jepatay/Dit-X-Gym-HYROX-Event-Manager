import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { secondsToHHMMSS } from '../utils/timeUtils'

export default function Leaderboard() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [teams, setTeams] = useState([])
  const [config, setConfig] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
    const interval = setInterval(loadAll, 30000)
    return () => clearInterval(interval)
  }, [id])

  async function loadAll() {
    try {
      const [evSnap, teamsSnap, configSnap] = await Promise.all([
        getDoc(doc(db, 'events', id)),
        getDocs(query(collection(db, 'teams'), where('eventId', '==', id))),
        getDoc(doc(db, 'config', 'main')),
      ])
      if (evSnap.exists()) setEvent(evSnap.data())
      if (configSnap.exists()) setConfig(configSnap.data())
      setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  const teamsWithResults = teams.filter(t => t.finishTimeSeconds != null)

  const byCategory = {}
  teamsWithResults.forEach(t => {
    if (!byCategory[t.categoryId]) byCategory[t.categoryId] = []
    byCategory[t.categoryId].push(t)
  })
  Object.values(byCategory).forEach(arr => arr.sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds))

  const categoryOrder = config?.categories?.map(c => c.id) || Object.keys(byCategory)

  if (loading) {
    return (
      <div style={{ background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', fontSize: 18, textTransform: 'uppercase' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', padding: '0 0 60px' }}>
      <div style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800, color: 'var(--color-accent)' }}>DIT X-GYM</span>
          <h1 style={{ fontSize: 24 }}>{event?.name} — Leaderboard</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{event?.date}</p>
          {lastUpdated && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {teamsWithResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 24, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Waiting for results...
            </p>
          </div>
        ) : (
          categoryOrder.filter(catId => byCategory[catId]?.length > 0).map(catId => {
            const catTeams = byCategory[catId]
            const cat = config?.categories?.find(c => c.id === catId)
            return (
              <div key={catId} style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 22, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid var(--color-accent)', color: 'var(--color-accent)' }}>
                  {cat?.label || catId}
                </h2>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Rank</th>
                      <th style={{ width: 60 }}>Bib</th>
                      <th>Name / Athlete(s)</th>
                      <th style={{ textAlign: 'right', width: 120 }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catTeams.map((team, i) => (
                      <tr key={team.id} style={{
                        background: i === 0 ? 'rgba(230,51,41,0.08)' : 'transparent',
                        fontSize: i === 0 ? 16 : 14,
                      }}>
                        <td style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: i === 0 ? 24 : 18,
                          fontWeight: 800,
                          color: i === 0 ? 'var(--color-warning)' : 'var(--color-text-muted)',
                        }}>
                          #{i + 1}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 500, fontSize: 14 }}>
                          {team.bibNumber}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontFamily: 'var(--font-heading)', fontSize: i === 0 ? 20 : 16 }}>
                            {team.name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                            {team.athlete1?.firstName} {team.athlete1?.lastName}
                            {team.athlete2?.firstName && <> / {team.athlete2.firstName} {team.athlete2.lastName}</>}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: i === 0 ? 24 : 16, fontWeight: i === 0 ? 700 : 400 }}>
                          {secondsToHHMMSS(team.finishTimeSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
