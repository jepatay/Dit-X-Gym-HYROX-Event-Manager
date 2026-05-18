import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { secondsToHHMMSS } from '../utils/timeUtils'

const CACHE_KEY = (slug) => `ditxgym_event_${slug}`

const BG       = '#0f1923'
const SURFACE  = '#1e2d45'
const SURFACE2 = '#243352'
const BORDER   = '#2d4060'
const BORDER2  = '#1a2840'
const ACCENT   = '#e8621a'
const TEXT     = '#f0f4f8'
const MUTED    = '#7a9abe'
const MUTED2   = '#5a7090'

const STATION_ORDER = [
  { key: 'run',          label: 'Run' },
  { key: 'skiErg',       label: 'Ski Erg' },
  { key: 'sledPush',     label: 'Sled Push' },
  { key: 'sledPull',     label: 'Sled Pull' },
  { key: 'burpee',       label: 'Burpee Broad Jump' },
  { key: 'rowing',       label: 'Row Erg' },
  { key: 'farmerCarry',  label: 'Farmers Carry' },
  { key: 'lunge',        label: 'Walking Lunges' },
  { key: 'wallBall',     label: 'Wall Ball' },
]

const HYBRID_STATION_ORDER = [
  { key: 'run',           label: 'Run' },
  { key: 'bikeErg',       label: 'Bike Erg' },
  { key: 'sledCombined',  label: 'Sled Push/Pull' },
  { key: 'rowing',        label: 'Row Erg' },
  { key: 'farmerDeadlift', label: 'Farmers Deadlift' },
  { key: 'skiErg',        label: 'Ski Erg' },
  { key: 'lunge',         label: 'Walking Lunges' },
  { key: 'burpee',        label: 'Burpee Broad Jump' },
  { key: 'assaultBike',   label: 'Assault Bike' },
]

function catLabel(team, config) {
  if (team.categoryId && config?.categories) {
    const cat = config.categories.find(c => c.id === team.categoryId)
    if (cat) return cat.label
  }
  return team.competitionName || ''
}

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
  const [checkInPopup, setCheckInPopup] = useState(false)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const clock = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(clock)
  }, [])

  useEffect(() => { loadData() }, [slug])

  async function loadData() {
    try {
      const q = query(collection(db, 'events'), where('publicSlug', '==', slug))
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
        setEvent(data.event); setTeams(data.teams); setConfig(data.config); setOffline(true)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: MUTED, fontFamily: 'Inter, sans-serif' }}>Loading...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div style={{ background: BG, minHeight: '100vh', padding: 32 }}>
        <p style={{ color: MUTED, fontFamily: 'Inter, sans-serif' }}>Event not found.</p>
      </div>
    )
  }

  const status = deriveStatus(event.date)
  const waves = (event.waves || []).sort((a, b) => a.startTime?.localeCompare(b.startTime))
  const weightSheet = { ...(config?.weightCheatSheet || {}), ...(event.weightOverrides || {}) }
  const eventCatType = event.eventType === 'Hybrid' ? 'hybrid' : 'hyrox'
  const weightCats = (config?.categories || []).filter(c =>
    weightSheet[c.id] && (c.eventType || 'hyrox') === eventCatType
  )

  const finishedTeams = teams.filter(t => t.finishTimeSeconds != null)
  const leaderboardByCategory = []
  if (config?.categories) {
    for (const cat of config.categories) {
      const catTeams = finishedTeams
        .filter(t => t.categoryId === cat.id)
        .sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)
      if (catTeams.length > 0) leaderboardByCategory.push({ cat, catTeams })
    }
  } else {
    const sorted = [...finishedTeams].sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)
    if (sorted.length > 0) leaderboardByCategory.push({ cat: { id: '_all', label: 'Results' }, catTeams: sorted })
  }

  const selectedStaff = (config?.staff || []).filter(s => (event.selectedStaffIds || []).includes(s.id))

  // Start list grouped by wave
  const sortedTeams = [...teams].sort((a, b) =>
    (a.scheduledTime || '').localeCompare(b.scheduledTime || '') || (a.ref || '').localeCompare(b.ref || '')
  )

  const startGroups = (() => {
    const map = {}
    for (const t of sortedTeams) {
      const key = t.scheduledTime || ''
      if (!map[key]) map[key] = []
      map[key].push(t)
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slotTime, members]) => {
        const slotMs = event?.date && slotTime
          ? new Date(`${event.date}T${slotTime}:00`).getTime()
          : null
        const diffSecs = slotMs != null ? (slotMs - time.getTime()) / 1000 : Infinity
        const started = diffSecs <= 0
        const graceOver = diffSecs < -15
        return { slotTime, members, diffSecs, started, graceOver }
      })
      .filter(g => !g.graceOver)
  })()

  function formatCountdown(diffSecs) {
    if (!isFinite(diffSecs) || diffSecs <= 0) return null
    const total = Math.floor(diffSecs)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  const tabs = [
    { id: 'startlist', label: 'Start List' },
    { id: 'mapstaff', label: 'Map + Staff' },
  ]

  const clockStr = time.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div style={{ background: BG, color: TEXT, minHeight: '100vh', fontFamily: 'Inter, sans-serif', maxWidth: 600, margin: '0 auto' }}>
      {offline && (
        <div style={{ background: '#1a1400', borderBottom: `1px solid ${ACCENT}44`, padding: '8px 16px', fontSize: 12, color: '#f59e0b', textAlign: 'center' }}>
          Offline — showing cached data
        </div>
      )}

      {/* Sticky header */}
      <div style={{ background: SURFACE, borderBottom: `3px solid ${ACCENT}`, padding: '10px 16px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 11, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.12em' }}>DIT X-GYM</span>
              <StatusBadge status={status} />
            </div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 22, color: TEXT, lineHeight: 1.1, textTransform: 'uppercase' }}>{event.name}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: MUTED, marginTop: 2 }}>{event.date}{event.eventType ? ` · ${event.eventType}` : ''}</div>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 28, color: ACCENT, lineHeight: 1, flexShrink: 0 }}>{clockStr}</div>
        </div>
        {(event.links || []).filter(l => l.url).length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {event.links.map((link, i) => link.url && (
              <a key={i} href={link.url} target="_blank" rel="noreferrer" style={{ padding: '5px 12px', background: ACCENT, color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, textDecoration: 'none' }}>
                {link.label || link.url}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${BORDER}`, background: '#192438', position: 'sticky', top: 0, zIndex: 19 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '12px 8px', background: 'transparent', border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${ACCENT}` : '2px solid transparent',
              marginBottom: -2,
              color: activeTab === tab.id ? ACCENT : MUTED,
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Start List Tab ── */}
      {activeTab === 'startlist' && (
        <Section title="Start List">
          {startGroups.length === 0 && (
            <p style={{ padding: '24px 20px', color: MUTED2, fontFamily: 'DM Mono, monospace', fontSize: 13 }}>No athletes registered yet</p>
          )}
          {startGroups.map(({ slotTime, members, diffSecs, started }) => {
            const countdown = formatCountdown(diffSecs)
            return (
              <div key={slotTime}>
                {/* Wave header */}
                <div style={{
                  padding: '10px 20px',
                  background: started ? 'rgba(34,197,94,0.08)' : SURFACE2,
                  borderTop: `2px solid ${started ? '#22c55e' : BORDER}`,
                  borderBottom: `1px solid ${started ? '#22c55e55' : BORDER}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 20, color: started ? '#22c55e' : TEXT }}>{slotTime}</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED2 }}>{members.length} team{members.length !== 1 ? 's' : ''}</span>
                  </div>
                  {started ? (
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#22c55e' }}>Started ✓</span>
                  ) : countdown ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 22, color: diffSecs < 120 ? ACCENT : TEXT, lineHeight: 1 }}>{countdown}</div>
                      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, color: MUTED2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>to start</div>
                    </div>
                  ) : null}
                </div>
                {/* Members */}
                {members.map(team => (
                  <div key={team.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: `1px solid ${BORDER2}`, gap: 12, opacity: started ? 0.65 : 1 }}>
                    <div style={{ minWidth: 56, flexShrink: 0 }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', color: ACCENT, fontWeight: 700, fontSize: 15 }}>{team.ref || team.bibNumber}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: TEXT }}>{team.name}</div>
                      {catLabel(team, config) && (
                        <div style={{ fontSize: 11, color: ACCENT, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{catLabel(team, config)}</div>
                      )}
                      {team.weight && (
                        <div style={{ fontSize: 11, color: '#f59e0b', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 1 }}>{team.weight}</div>
                      )}
                      <div style={{ fontSize: 12, color: MUTED2, marginTop: 2 }}>
                        {team.athlete1?.firstName} {team.athlete1?.lastName}
                        {team.athlete2?.firstName && <> / {team.athlete2.firstName} {team.athlete2.lastName}</>}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      {team.finishTimeSeconds != null ? (
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: '#22c55e', fontWeight: 700 }}>{secondsToHHMMSS(team.finishTimeSeconds)}</div>
                      ) : team.checkedIn ? (
                        <span style={{ fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#22c55e', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', padding: '3px 8px' }}>✓ IN</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </Section>
      )}

      {/* ── Map + Staff Tab ── */}
      {activeTab === 'mapstaff' && (
        <>
          {/* Staff */}
          <Section title="Staff">
            {selectedStaff.length === 0 ? (
              <p style={{ padding: '24px 20px', color: MUTED2, fontFamily: 'DM Mono, monospace', fontSize: 13 }}>No staff assigned</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {selectedStaff.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: i % 2 === 0 ? BG : SURFACE }}>
                    {s.photoUrl ? (
                      <img src={s.photoUrl} alt={s.name} style={{ width: 48, height: 48, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, background: SURFACE2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED2, fontSize: 20 }}>?</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                        {s.role}{s.station ? ` — ${s.station}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Maps */}
          {(event.maps?.gymLayout || event.maps?.runRoute) && (
            <Section title="Maps">
              {event.maps.gymLayout && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: MUTED, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 20px 8px' }}>Gym Layout</p>
                  <img src={event.maps.gymLayout} alt="Gym Layout" style={{ width: '100%', display: 'block' }} />
                </div>
              )}
              {event.maps.runRoute && (
                <div>
                  <p style={{ fontSize: 12, color: MUTED, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 20px 8px' }}>Run Route</p>
                  <img src={event.maps.runRoute} alt="Run Route" style={{ width: '100%', display: 'block' }} />
                </div>
              )}
            </Section>
          )}

          {/* Stations */}
          {weightCats.length > 0 && (
            <Section title="Stations">
              {weightCats.map(cat => {
                const weights = weightSheet[cat.id] || {}
                const isOpen = expandedWeights[cat.id]
                const stationOrder = (cat.eventType === 'hybrid') ? HYBRID_STATION_ORDER : STATION_ORDER
                const orderedEntries = stationOrder
                  .map(({ key, label }) => weights[key] != null && weights[key] !== '' ? { key, label, val: weights[key] } : null)
                  .filter(Boolean)
                return (
                  <div key={cat.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <button
                      onClick={() => setExpandedWeights(e => ({ ...e, [cat.id]: !e[cat.id] }))}
                      style={{ width: '100%', padding: '12px 20px', background: 'transparent', border: 'none', color: TEXT, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      {cat.label}
                      <span style={{ color: MUTED }}>{isOpen ? '▲' : '▼'}</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                        {[orderedEntries.slice(0, 5), orderedEntries.slice(5)].map((col, ci) => (
                          <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10 }}>
                            {col.map(({ key, label, val }) => (
                              <div key={key}>
                                <div style={{ fontSize: 10, color: MUTED2, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                                  {label}
                                </div>
                                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: ACCENT, fontWeight: 500 }}>{val}</div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </Section>
          )}
        </>
      )}

      {/* Footer */}
      <footer style={{ background: SURFACE, borderTop: `2px solid ${BORDER}`, padding: '32px 20px 40px', marginTop: 40 }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.06em', color: TEXT, marginBottom: 14 }}>
          DIT X-GYM
        </div>
        <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.8, marginBottom: 20 }}>
          Sortevej 8<br />
          8543 Hornslet<br />
          <br />
          <a href="tel:+4561482200" style={{ color: MUTED, textDecoration: 'none' }}>+45 61 48 22 00</a>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href="https://www.facebook.com/ditxgym/"
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook"
            style={{ width: 40, height: 40, background: SURFACE2, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT, textDecoration: 'none' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
            </svg>
          </a>
          <a
            href="https://www.instagram.com/ditxgym/"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            style={{ width: 40, height: 40, background: SURFACE2, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT, textDecoration: 'none' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </a>
        </div>
      </footer>

      {/* Check-in popup */}
      {checkInPopup && (
        <div
          onClick={() => setCheckInPopup(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: SURFACE, border: `1px solid ${BORDER}`,
              padding: '32px 28px', maxWidth: 320, width: '100%', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 16 }}>👋</div>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: TEXT, marginBottom: 12 }}>
              Meet a Staff member
            </h2>
            <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Please find one of our staff members at the check-in desk to complete your registration.
            </p>
            <button
              onClick={() => setCheckInPopup(false)}
              style={{
                padding: '10px 28px', background: ACCENT, color: '#fff', border: 'none',
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 0 }}>
      <div style={{ padding: '16px 20px 10px', borderBottom: `2px solid ${ACCENT}` }}>
        <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: ACCENT }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

function StatusBadge({ status }) {
  const colors = { future: '#3b82f6', live: '#e8621a', past: '#7a9abe' }
  const color = colors[status] || '#7a9abe'
  return (
    <span style={{
      fontSize: 10, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.1em',
      padding: '2px 8px', background: color + '22', color, border: `1px solid ${color}44`,
    }}>{status}</span>
  )
}
