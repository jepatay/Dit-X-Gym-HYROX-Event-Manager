import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import EventNav from '../components/EventNav'

export default function StartList() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDoc(doc(db, 'events', id)),
      getDocs(query(collection(db, 'teams'), where('eventId', '==', id))),
    ]).then(([evSnap, teamsSnap]) => {
      if (evSnap.exists()) setEvent(evSnap.data())
      setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [id])

  if (loading) return <div><EventNav id={id} /><p style={{ padding: 32, color: '#888' }}>Loading...</p></div>

  const waves = (event?.waves || []).sort((a, b) => a.startTime?.localeCompare(b.startTime))

  return (
    <div style={{ background: '#fff', color: '#000', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <EventNav id={id} eventName={event?.name} publicSlug={event?.publicSlug} />
      <div className="no-print" style={{ padding: '12px 24px', background: '#111', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#E63329', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 13, fontWeight: 700 }}>
          Print
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32, borderBottom: '2px solid #000', paddingBottom: 20 }}>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 40, textTransform: 'uppercase', marginBottom: 4 }}>
            {event?.name}
          </h1>
          <p style={{ fontSize: 16, color: '#555' }}>{event?.date}</p>
          <p style={{ fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{event?.eventType}</p>
        </div>

        {waves.map(wave => {
          if (wave.isRestWave) {
            return (
              <div key={wave.id} style={{ textAlign: 'center', padding: '16px 0', color: '#999', fontSize: 14, borderBottom: '1px solid #eee', fontStyle: 'italic' }}>
                ── {wave.label} — {wave.durationMinutes} min ──
              </div>
            )
          }

          const waveTeams = teams.filter(t => t.waveId === wave.id).sort((a, b) => a.bibNumber - b.bibNumber)
          if (waveTeams.length === 0) return null

          return (
            <div key={wave.id} style={{ marginBottom: 32, pageBreakBefore: 'auto' }}>
              <div style={{ background: '#111', color: '#fff', padding: '8px 16px', marginBottom: 0 }}>
                <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, textTransform: 'uppercase', display: 'inline', marginRight: 16 }}>
                  {wave.label}
                </h2>
                <span style={{ fontSize: 14, color: '#aaa' }}>Start: {wave.startTime}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #ddd', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.1em', width: 60 }}>Time</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #ddd', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.1em', width: 55 }}>Bib</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #ddd', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.1em' }}>Name</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #ddd', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.1em' }}>Athletes</th>
                  </tr>
                </thead>
                <tbody>
                  {waveTeams.map((team, i) => (
                    <tr key={team.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee', fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 13 }}>
                        {team.scheduledTime}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee', fontFamily: 'DM Mono, monospace', color: '#E63329', fontWeight: 700, fontSize: 15 }}>
                        {team.bibNumber}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee', fontWeight: 700 }}>
                        {team.name}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee', color: '#555', fontSize: 12 }}>
                        {team.athlete1?.firstName} {team.athlete1?.lastName}
                        {team.athlete2?.firstName && (
                          <span> / {team.athlete2.firstName} {team.athlete2.lastName}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}
