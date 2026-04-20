import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { secondsToHHMMSS } from '../utils/timeUtils'

const CACHE_KEY = (slug) => `ditxgym_event_${slug}`

const STATION_ORDER = [
  { key: 'run',          label: 'Run' },
  { key: 'skiErg',       label: 'Ski Erg' },
  { key: 'sledPush',     label: 'Sled Push' },
  { key: 'sledPull',     label: 'Sled Pull' },
  { key: 'burpee',       label: 'Burpee Broad Jump' },
  { key: 'rowing',       label: 'Row Erg' },
  { key: 'farmerCarry',  label: 'Farmers Carry' },
  { key: 'sandbag',      label: 'Sandbag Weight' },
  { key: 'lunge',        label: 'Walking Lunges' },
  { key: 'wallBall',     label: 'Wall Ball' },
]

function deriveStatus(eventDate) {
  if (!eventDate) return 'future'
  const today = new Date().toISOString().slice(0, 10)
  if (eventDate < today) return 'past'
  if (eventDate === today) return 'live'
  return 'future'
}

export default function PublicEventPage() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [teams, setTeams] = useState([])
  const [config, setConfig] = useState(null)
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedWeights, setExpandedWeights] = useState({})
  const [activeTab, setActiveTab] = useState('startlist')

  useEffect(() => {
    loadData()
  }, [slug])

  async function loadData() {
    try {
      const eventsRef = collection(db, 'events')
      const q = query(eventsRef, where('publicSlug', '==', slug))
      const snap = await getDocs(q)
      if (snap.empty) { setLoading(false); return }

      const eventDoc = snap.docs[0]
      const eventData = { id: eventDoc.id, ...eventDoc.data() }

      const [teamsSnap, configSnap] = await Promise.all([
        getDocs(query(collection(db, 'teams'), where('eventId', '==', eventDoc.id))),
        getDoc(doc(db, 'config', 'main')),
      ])

      const teamsData = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const configData = configSnap.exists() ? configSnap.data() : null

      setEvent(eventData)
      setTeams(teamsData)
      setConfig(configData)
      setOffline(false)

      localStorage.setItem(CACHE_KEY(slug), JSON.stringify({ event: eventData, teams: teamsData, config: configData }))
    } catch {
      const cached = localStorage.getItem(CACHE_KEY(slug))
      if (cached) {
        const data = JSON.parse(cached)
        setEvent(data.event)
        setTeams(data.teams)
        setConfig(data.config)
        setOffline(true)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ background: '#0f0f0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888', fontFamily: 'sans-serif' }}>Loading...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div style={{ background: '#0f0f0f', minHeight: '100vh', padding: 32 }}>
        <p style={{ color: '#888', fontFamily: 'sans-serif' }}>Event not found.</p>
      </div>
    )
  }

  const status = deriveStatus(event.date)
  const waves = (event.waves || []).sort((a, b) => a.startTime?.localeCompare(b.startTime))
  const weightSheet = { ...(config?.weightCheatSheet || {}), ...(event.weightOverrides || {}) }
  const weightCats = config?.categories?.filter(c => weightSheet[c.id]) || []

  // Leaderboard: teams with finishTimeSeconds, grouped by category
  const finishedTeams = teams.filter(t => t.finishTimeSeconds != null)
  const leaderboardByCategory = []
  if (config?.categories) {
    for (const cat of config.categories) {
      const catTeams = finishedTeams
        .filter(t => t.categoryId === cat.id)
        .sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)
      if (catTeams.length > 0) {
        leaderboardByCategory.push({ cat, catTeams })
      }
    }
  } else {
    // No categories config — show all finished teams ungrouped
    const sorted = [...finishedTeams].sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)
    if (sorted.length > 0) {
      leaderboardByCategory.push({ cat: { id: '_all', label: 'Results' }, catTeams: sorted })
    }
  }

  // Staff: config staff filtered by event.selectedStaffIds
  const selectedStaff = (config?.staff || []).filter(s => (event.selectedStaffIds || []).includes(s.id))

  const tabs = [
    { id: 'startlist', label: 'Start List' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'staff', label: 'Staff' },
  ]

  return (
    <div style={{ background: '#0f0f0f', color: '#fff', minHeight: '100vh', fontFamily: 'Inter, sans-serif', maxWidth: 600, margin: '0 auto', padding: '0 0 60px' }}>
      {offline && (
        <div style={{ background: '#1a1400', borderBottom: '1px solid #f59e0b44', padding: '8px 16px', fontSize: 12, color: '#f59e0b', textAlign: 'center' }}>
          Offline — showing cached data
        </div>
      )}

      {/* Event Header */}
      <div style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 20, color: '#E63329', textTransform: 'uppercase' }}>DIT X-GYM</span>
          <StatusBadge status={status} />
        </div>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 32, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 4 }}>
          {event.name}
        </h1>
        <p style={{ fontFamily: 'DM Mono, monospace', color: '#888', fontSize: 14 }}>{event.date}</p>
        {event.eventType && (
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#666', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{event.eventType}</p>
        )}

        {(event.links || []).length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            {event.links.map((link, i) => link.url && (
              <a key={i} href={link.url} target="_blank" rel="noreferrer" style={{
                padding: '7px 14px',
                background: '#E63329',
                color: '#fff',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-block',
              }}>
                {link.label || link.url}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #2a2a2a', background: '#141414' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '12px 8px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #E63329' : '2px solid transparent',
              marginBottom: -2,
              color: activeTab === tab.id ? '#E63329' : '#888',
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 15,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Start List Tab */}
      {activeTab === 'startlist' && (
        <Section title="Start List">
          {waves.map(wave => {
            if (wave.isRestWave) {
              return (
                <div key={wave.id} style={{ padding: '12px 20px', color: '#666', fontSize: 13, fontStyle: 'italic', textAlign: 'center', borderBottom: '1px solid #2a2a2a' }}>
                  ── {wave.label} — {wave.durationMinutes} min ──
                </div>
              )
            }
            const waveTeams = teams.filter(t => t.waveId === wave.id).sort((a, b) => a.bibNumber - b.bibNumber)
            if (waveTeams.length === 0) return null
            return (
              <div key={wave.id}>
                <div style={{ background: '#1a1a1a', padding: '8px 20px', borderBottom: '1px solid #2a2a2a', borderTop: '1px solid #2a2a2a' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, textTransform: 'uppercase' }}>{wave.label}</span>
                  <span style={{ marginLeft: 12, fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#888' }}>{wave.startTime}</span>
                </div>
                {waveTeams.map(team => (
                  <div key={team.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #1e1e1e', gap: 12 }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', color: '#E63329', fontWeight: 700, fontSize: 16, minWidth: 40 }}>{team.bibNumber}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', color: '#888', fontSize: 13, minWidth: 44 }}>{team.scheduledTime}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{team.name}</div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                        {team.athlete1?.firstName} {team.athlete1?.lastName}
                        {team.athlete2?.firstName && <> / {team.athlete2.firstName} {team.athlete2.lastName}</>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </Section>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <Section title="Leaderboard">
          {leaderboardByCategory.length === 0 ? (
            <p style={{ padding: '24px 20px', color: '#666', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>No results yet</p>
          ) : (
            leaderboardByCategory.map(({ cat, catTeams }) => (
              <div key={cat.id}>
                <div style={{ background: '#1a1a1a', padding: '8px 20px', borderBottom: '1px solid #2a2a2a', borderTop: '1px solid #2a2a2a' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', color: '#ccc' }}>{cat.label}</span>
                </div>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '36px 40px 1fr auto', gap: 8, padding: '6px 20px', borderBottom: '1px solid #222' }}>
                  <span style={{ fontSize: 10, color: '#555', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>#</span>
                  <span style={{ fontSize: 10, color: '#555', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bib</span>
                  <span style={{ fontSize: 10, color: '#555', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Team</span>
                  <span style={{ fontSize: 10, color: '#555', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Time</span>
                </div>
                {catTeams.map((team, idx) => (
                  <div key={team.id} style={{ display: 'grid', gridTemplateColumns: '36px 40px 1fr auto', gap: 8, padding: '12px 20px', borderBottom: '1px solid #1e1e1e', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 15, color: idx === 0 ? '#f59e0b' : idx === 1 ? '#9ca3af' : idx === 2 ? '#b45309' : '#555' }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontFamily: 'DM Mono, monospace', color: '#E63329', fontWeight: 700, fontSize: 14 }}>{team.bibNumber}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{team.name}</div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                        {team.athlete1?.firstName} {team.athlete1?.lastName}
                        {team.athlete2?.firstName && <> / {team.athlete2.firstName} {team.athlete2.lastName}</>}
                      </div>
                    </div>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#E63329', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {secondsToHHMMSS(team.finishTimeSeconds)}
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </Section>
      )}

      {/* Staff Tab */}
      {activeTab === 'staff' && (
        <Section title="Staff">
          {selectedStaff.length === 0 ? (
            <p style={{ padding: '24px 20px', color: '#666', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>No staff assigned</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {selectedStaff.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: i % 2 === 0 ? '#161616' : '#1a1a1a' }}>
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt={s.name} style={{ width: 48, height: 48, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 48, height: 48, background: '#2a2a2a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 20 }}>?</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {s.role}{s.station ? ` — ${s.station}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Maps — always visible */}
      {(event.maps?.gymLayout || event.maps?.runRoute) && (
        <Section title="Maps">
          {event.maps.gymLayout && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#888', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 20px 8px' }}>Gym Layout</p>
              <img src={event.maps.gymLayout} alt="Gym Layout" style={{ width: '100%', display: 'block' }} />
            </div>
          )}
          {event.maps.runRoute && (
            <div>
              <p style={{ fontSize: 12, color: '#888', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 20px 8px' }}>Run Route</p>
              <img src={event.maps.runRoute} alt="Run Route" style={{ width: '100%', display: 'block' }} />
            </div>
          )}
        </Section>
      )}

      {/* Station Reference — always visible */}
      {weightCats.length > 0 && (
        <Section title="Station Reference">
          {weightCats.map(cat => {
            const weights = weightSheet[cat.id] || {}
            const isOpen = expandedWeights[cat.id]
            const orderedEntries = STATION_ORDER
              .map(({ key, label }) => weights[key] != null && weights[key] !== '' ? { key, label, val: weights[key] } : null)
              .filter(Boolean)
            return (
              <div key={cat.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                <button
                  onClick={() => setExpandedWeights(e => ({ ...e, [cat.id]: !e[cat.id] }))}
                  style={{ width: '100%', padding: '12px 20px', background: 'transparent', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  {cat.label}
                  <span style={{ color: '#888' }}>{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                    {orderedEntries.map(({ key, label, val }) => (
                      <div key={key}>
                        <div style={{ fontSize: 10, color: '#666', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                          {label}
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: '#E63329', fontWeight: 500 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 0 }}>
      <div style={{ padding: '16px 20px 10px', borderBottom: '2px solid #E63329' }}>
        <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E63329' }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

function StatusBadge({ status }) {
  const colors = { future: '#3b82f6', live: '#E63329', past: '#888' }
  const color = colors[status] || '#888'
  return (
    <span style={{
      fontSize: 10,
      fontFamily: 'Barlow Condensed, sans-serif',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      padding: '2px 8px',
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
    }}>{status}</span>
  )
}
