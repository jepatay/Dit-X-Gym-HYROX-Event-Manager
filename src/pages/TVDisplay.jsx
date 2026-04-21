import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { QRCodeSVG } from 'qrcode.react'
import { db } from '../firebase'
import { secondsToHHMMSS } from '../utils/timeUtils'

const BG      = '#0f1923'
const SURFACE = '#1e2d45'
const SURFACE2= '#243352'
const BORDER  = '#2d4060'
const BORDER2 = '#1a2840'
const ACCENT  = '#e8621a'
const TEXT    = '#f0f4f8'
const MUTED   = '#7a9abe'
const MUTED2  = '#5a7090'
const SUCCESS = '#22c55e'
const GOLD    = '#f59e0b'
const SILVER  = '#9ca3af'
const BRONZE  = '#b45309'

export default function TVDisplay() {
  const { id } = useParams()
  const [event, setEvent]   = useState(null)
  const [teams, setTeams]   = useState([])
  const [config, setConfig] = useState(null)
  const [time, setTime]     = useState(new Date())
  const [fullscreen, setFullscreen] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    loadData()
    const data  = setInterval(loadData, 30000)
    const clock = setInterval(() => setTime(new Date()), 1000)
    return () => { clearInterval(data); clearInterval(clock) }
  }, [id])

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  async function loadData() {
    try {
      const [evSnap, teamsSnap, configSnap] = await Promise.all([
        getDoc(doc(db, 'events', id)),
        getDocs(query(collection(db, 'teams'), where('eventId', '==', id))),
        getDoc(doc(db, 'config', 'main')),
      ])
      if (evSnap.exists()) setEvent(evSnap.data())
      setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      if (configSnap.exists()) setConfig(configSnap.data())
      setLastUpdated(new Date())
    } catch (_) {}
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen()
    else document.exitFullscreen()
  }

  if (!event) return (
    <div style={{ background: BG, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: MUTED, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Loading...</p>
    </div>
  )

  const now = `${String(time.getHours()).padStart(2,'0')}:${String(time.getMinutes()).padStart(2,'0')}`
  const isToday = event.date === new Date().toISOString().slice(0, 10)

  const allSorted = [...teams].sort((a, b) =>
    (a.scheduledTime || '').localeCompare(b.scheduledTime || '') || (a.bibNumber || 0) - (b.bibNumber || 0)
  )
  let nextAthletes
  if (isToday) {
    const upcoming = allSorted.filter(t => (t.scheduledTime || '99:99') >= now)
    nextAthletes = upcoming.length >= 3 ? upcoming.slice(0, 10) : allSorted.slice(0, 10)
  } else {
    nextAthletes = allSorted.slice(0, 10)
  }

  const finishedTeams = teams.filter(t => t.finishTimeSeconds != null)
  const leaderboardByCat = []
  if (config?.categories) {
    for (const cat of config.categories) {
      const top3 = finishedTeams
        .filter(t => t.categoryId === cat.id)
        .sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)
        .slice(0, 3)
      if (top3.length) leaderboardByCat.push({ cat, top3 })
    }
  }

  const staff = (config?.staff || []).filter(s => (event.selectedStaffIds || []).includes(s.id))
  const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin
  const publicUrl = event.publicSlug ? `${baseUrl}/e/${event.publicSlug}` : ''
  const clockStr = time.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div style={{ background: BG, color: TEXT, width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ background: SURFACE, borderBottom: `3px solid ${ACCENT}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 14, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.12em' }}>DIT X-GYM</span>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 30, textTransform: 'uppercase', letterSpacing: '0.04em', color: TEXT, margin: 0 }}>{event.name}</h1>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: MUTED }}>{event.date}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 56, color: TEXT, lineHeight: 1, letterSpacing: '-0.01em' }}>{clockStr}</span>
          <button onClick={toggleFullscreen} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {fullscreen ? '⊠ Exit' : '⊡ Fullscreen'}
          </button>
        </div>
      </div>

      {/* ── 3-column grid ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '5fr 5fr 3fr', gap: 2, background: BORDER2, overflow: 'hidden', minHeight: 0 }}>

        {/* Panel 1 — Next Up */}
        <Panel title="Start List" subtitle={isToday ? `upcoming from ${now}` : event.date}>
          {nextAthletes.length === 0 ? (
            <Empty>No upcoming starts</Empty>
          ) : <>
            <Row header>
              <Cell w={48} muted>Bib</Cell>
              <Cell w={52} muted>Time</Cell>
              <Cell flex muted>Athlete</Cell>
              <Cell w={80} muted right>Status</Cell>
            </Row>
            {nextAthletes.map(team => (
              <Row key={team.id}>
                <Cell w={48} accent mono bold size={17}>{team.bibNumber}</Cell>
                <Cell w={52} muted mono size={13}>{team.scheduledTime}</Cell>
                <Cell flex>
                  <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>{team.name}</div>
                  <div style={{ fontSize: 11, color: MUTED2, marginTop: 2 }}>
                    {team.athlete1?.firstName} {team.athlete1?.lastName}
                    {team.athlete2?.firstName && ` / ${team.athlete2.firstName}`}
                  </div>
                </Cell>
                <Cell w={80} right>
                  {team.checkedIn
                    ? <Badge color={SUCCESS}>✓ In</Badge>
                    : <Badge color={MUTED2}>Pending</Badge>}
                </Cell>
              </Row>
            ))}
          </>}
        </Panel>

        {/* Panel 2 — Leaderboard */}
        <Panel title="Leaderboard" subtitle="top 3 per category">
          {leaderboardByCat.length === 0 ? (
            <Empty>No results yet</Empty>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: leaderboardByCat.length > 4 ? '1fr 1fr' : '1fr', gap: '0 14px' }}>
              {leaderboardByCat.map(({ cat, top3 }) => (
                <div key={cat.id} style={{ marginBottom: leaderboardByCat.length > 4 ? 8 : 12 }}>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, paddingBottom: 3, borderBottom: `1px solid ${BORDER}`, marginBottom: 2 }}>
                    {cat.label}
                  </div>
                  {top3.map((team, idx) => (
                    <Row key={team.id} tight>
                      <Cell w={18} bold size={13} style={{ color: [GOLD, SILVER, BRONZE][idx] }}>{idx + 1}</Cell>
                      <Cell w={34} accent mono bold size={12}>{team.bibNumber}</Cell>
                      <Cell flex size={12} bold={idx === 0}>{team.name}</Cell>
                      <Cell w={68} mono bold size={11} accent right>{secondsToHHMMSS(team.finishTimeSeconds)}</Cell>
                    </Row>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Panel 3 — QR + Staff */}
        <div style={{ background: BG, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* QR */}
          <div style={{ padding: '16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: ACCENT }}>Scan to follow live</span>
            {publicUrl
              ? <div style={{ background: '#fff', padding: 10 }}><QRCodeSVG value={publicUrl} size={120} bgColor="#ffffff" fgColor="#000000" level="M" /></div>
              : <p style={{ color: MUTED2, fontSize: 12 }}>No public URL</p>}
          </div>

          {/* Staff */}
          <div style={{ padding: '14px 16px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: ACCENT, paddingBottom: 8, borderBottom: `2px solid ${ACCENT}`, marginBottom: 10, flexShrink: 0 }}>Staff</div>
            {staff.length === 0
              ? <Empty>No staff assigned</Empty>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {staff.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {s.photoUrl
                        ? <img src={s.photoUrl} alt={s.name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 38, height: 38, borderRadius: '50%', background: SURFACE2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED2, fontSize: 16 }}>?</div>}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{s.name}</div>
                        {(s.role || s.station) && <div style={{ fontSize: 11, color: MUTED2, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[s.role, s.station].filter(Boolean).join(' · ')}</div>}
                      </div>
                    </div>
                  ))}
                </div>}
          </div>
        </div>
      </div>

      {/* ── Refresh timestamp ── */}
      <div style={{ position: 'fixed', bottom: 8, right: 14, fontSize: 10, color: BORDER, fontFamily: 'DM Mono, monospace', pointerEvents: 'none' }}>
        {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · auto-refresh 30s` : ''}
      </div>
    </div>
  )
}

/* ── small layout helpers ── */

function Panel({ title, subtitle, children }) {
  return (
    <div style={{ background: BG, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px 10px', borderBottom: `2px solid ${ACCENT}`, flexShrink: 0 }}>
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.06em', color: ACCENT }}>{title}</span>
        {subtitle && <span style={{ marginLeft: 10, fontSize: 11, color: MUTED2, fontFamily: 'DM Mono, monospace' }}>{subtitle}</span>}
      </div>
      <div style={{ flex: 1, padding: '10px 20px', overflowY: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ children, header, compact, tight }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: tight ? '2px 0' : compact ? '5px 0' : '8px 0',
      borderBottom: header ? `1px solid ${BORDER}` : `1px solid ${BORDER2}`,
      marginBottom: header ? 4 : 0,
    }}>
      {children}
    </div>
  )
}

function Cell({ children, w, flex, muted, accent, mono, bold, size, right, compact, style }) {
  return (
    <div style={{
      width: w, flex: flex ? 1 : undefined, minWidth: 0,
      color: muted ? MUTED2 : accent ? ACCENT : undefined,
      fontFamily: mono ? 'DM Mono, monospace' : undefined,
      fontWeight: bold ? 700 : undefined,
      fontSize: size,
      textAlign: right ? 'right' : undefined,
      flexShrink: w ? 0 : undefined,
      ...style,
    }}>
      {children}
    </div>
  )
}

function Badge({ children, color }) {
  return (
    <span style={{ fontSize: 11, color, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function Empty({ children }) {
  return <p style={{ color: MUTED2, fontSize: 13, fontFamily: 'DM Mono, monospace', padding: '12px 0' }}>{children}</p>
}
