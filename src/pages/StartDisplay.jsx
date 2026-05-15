import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore'
import { db } from '../firebase'

const BG      = '#0f1923'
const SURFACE = '#1e2d45'
const BORDER  = '#2d4060'
const BORDER2 = '#1a2840'
const ACCENT  = '#e8621a'
const TEXT    = '#f0f4f8'
const MUTED   = '#7a9abe'
const MUTED2  = '#5a7090'
const SUCCESS = '#22c55e'
const WARNING = '#f59e0b'
const DANGER  = '#ef4444'

function secondsUntil(scheduledTime) {
  if (!scheduledTime) return Infinity
  const [h, m] = scheduledTime.split(':').map(Number)
  const target = new Date()
  target.setHours(h, m, 0, 0)
  return Math.ceil((target - new Date()) / 1000)
}

function fmtCountdown(secs) {
  if (secs <= 0) return '0'
  if (secs <= 60) return String(secs)
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

export default function StartDisplay() {
  const { id } = useParams()
  const [event, setEvent]   = useState(null)
  const [teams, setTeams]   = useState([])
  const [, setTick]         = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioPlayedRef = useRef(null)
  const audioRef = useRef(null)
  const audioTimeoutRef = useRef(null)

  useEffect(() => {
    audioRef.current = new Audio('/countdown.mp3')
    audioRef.current.load()
  }, [])

  useEffect(() => {
    const unsubs = [
      onSnapshot(doc(db, 'events', id), snap => {
        if (snap.exists()) setEvent(snap.data())
      }),
      onSnapshot(
        query(collection(db, 'teams'), where('eventId', '==', id)),
        snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      ),
    ]
    const clock = setInterval(() => setTick(t => t + 1), 1000)
    return () => { unsubs.forEach(u => u()); clearInterval(clock) }
  }, [id])

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen()
    else document.exitFullscreen()
  }

  if (!event) return (
    <div style={{ background: BG, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: MUTED, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Loading...</p>
    </div>
  )

  const clockStr = new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const isToday = event.date === new Date().toISOString().slice(0, 10)

  // Group teams into waves by scheduledTime
  const waveMap = {}
  for (const team of teams) {
    if (!team.scheduledTime) continue
    if (!waveMap[team.scheduledTime]) waveMap[team.scheduledTime] = []
    waveMap[team.scheduledTime].push(team)
  }
  // Only show waves on the actual event day
  const waves = !isToday ? [] : Object.entries(waveMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([t]) => secondsUntil(t) > -5)
    .slice(0, 3)

  // Schedule countdown audio to fire 250ms before the 5-second mark — once per wave
  if (soundEnabled && waves.length > 0) {
    const [nextWaveTime] = waves[0]
    const secsToNext = secondsUntil(nextWaveTime)
    if (secsToNext <= 6 && secsToNext > 0 && audioPlayedRef.current !== nextWaveTime) {
      audioPlayedRef.current = nextWaveTime
      clearTimeout(audioTimeoutRef.current)
      const [h, m] = nextWaveTime.split(':').map(Number)
      const target = new Date(); target.setHours(h, m, 0, 0)
      const delay = Math.max(0, (target - new Date()) - 5000 - 400)
      audioTimeoutRef.current = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {})
        }
      }, delay)
    }
  }

  return (
    <div style={{ background: BG, color: TEXT, width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: SURFACE, borderBottom: `3px solid ${ACCENT}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 14, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.12em' }}>DIT X-GYM</span>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 30, textTransform: 'uppercase', letterSpacing: '0.04em', color: TEXT, margin: 0 }}>{event.name}</h1>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: MUTED2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Starting Line</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 56, color: TEXT, lineHeight: 1, letterSpacing: '-0.01em' }}>{clockStr}</span>
          <button
            onClick={() => setSoundEnabled(s => !s)}
            style={{ background: soundEnabled ? ACCENT : 'transparent', border: `1px solid ${soundEnabled ? ACCENT : BORDER}`, color: soundEnabled ? '#fff' : MUTED, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            {soundEnabled ? '♪ Sound On' : '♪ Sound Off'}
          </button>
          <button onClick={toggleFullscreen} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {fullscreen ? '⊠ Exit' : '⊡ Fullscreen'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, background: BORDER2, overflow: 'hidden', minHeight: 0 }}>
        {waves.length === 0 ? (
          <div style={{ flex: 1, background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <p style={{ color: MUTED2, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 32, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {isToday ? 'No upcoming waves' : 'Event not started yet'}
            </p>
            {!isToday && (
              <p style={{ color: MUTED2, fontFamily: 'DM Mono, monospace', fontSize: 16 }}>
                Event date: {event.date}
              </p>
            )}
          </div>
        ) : <>
          {/* NEXT — big panel */}
          <NextPanel wave={waves[0]} eventWaves={event.waves || []} />

          {/* Wave 2 + 3 — compact row below */}
          {waves.length > 1 && (
            <div style={{ display: 'flex', gap: 2, height: 185, flexShrink: 0 }}>
              <SmallPanel wave={waves[1]} label="GET READY" eventWaves={event.waves || []} />
              {waves[2]
                ? <SmallPanel wave={waves[2]} label="UP NEXT" eventWaves={event.waves || []} />
                : <div style={{ flex: 1, background: BG }} />}
            </div>
          )}
        </>}
      </div>
    </div>
  )
}

function NextPanel({ wave, eventWaves }) {
  const [scheduledTime, athletes] = wave
  const secs = secondsUntil(scheduledTime)
  const isGo = secs <= 0
  const isLastMinute = secs > 0 && secs <= 60

  let countdownColor = TEXT
  if (isGo)            countdownColor = SUCCESS
  else if (secs <= 10) countdownColor = DANGER
  else if (secs <= 30) countdownColor = WARNING

  const countdownText = isGo ? 'GO!' : fmtCountdown(secs)
  const countdownSize = isLastMinute || isGo ? 140 : 88

  const sorted = [...athletes].sort((a, b) => (a.ref || '').localeCompare(b.ref || '') || (a.bibNumber || 0) - (b.bibNumber || 0))

  // Find wave label/name from event waves
  const matchingWave = eventWaves.find(w => w.startTime === scheduledTime)
  const waveTitle = matchingWave ? (matchingWave.name ? `${matchingWave.label} — ${matchingWave.name}` : matchingWave.label) : null

  return (
    <div style={{ flex: 1, background: BG, display: 'flex', flexDirection: 'column', padding: '22px 40px', overflow: 'hidden', minHeight: 0 }}>

      {/* Top bar: NEXT label + wave time + countdown */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.14em', color: ACCENT, border: `2px solid ${ACCENT}`, padding: '2px 10px' }}>NEXT</span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 60, color: TEXT, lineHeight: 1, letterSpacing: '-0.01em' }}>{scheduledTime}</span>
          {waveTitle && (
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{waveTitle}</span>
          )}
        </div>

        {/* Countdown */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 900,
            fontSize: countdownSize,
            color: countdownColor,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            transition: 'color 0.4s, font-size 0.2s',
          }}>
            {countdownText}
          </span>
          {!isGo && (
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: MUTED2, marginTop: 4 }}>
              {isLastMinute ? 'seconds' : 'min:sec'}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderBottom: `2px solid ${ACCENT}`, marginBottom: 20, flexShrink: 0 }} />

      {/* Athletes */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sorted.map(team => (
          <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 26, color: ACCENT, width: 72, flexShrink: 0 }}>{team.ref || team.bibNumber}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 36, lineHeight: 1.05, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{team.name}</div>
              {team.competitionName && (
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 1 }}>{team.competitionName}</div>
              )}
              <div style={{ fontSize: 15, color: MUTED, marginTop: 1 }}>
                {team.athlete1?.firstName} {team.athlete1?.lastName}
                {team.athlete2?.firstName && ` · ${team.athlete2.firstName} ${team.athlete2.lastName}`}
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              {team.checkedIn
                ? <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 22, color: SUCCESS, letterSpacing: '0.06em' }}>✓ CHECKED IN</span>
                : <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 22, color: MUTED2, letterSpacing: '0.06em' }}>PENDING</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SmallPanel({ wave, label, eventWaves }) {
  const [scheduledTime, athletes] = wave
  const secs = secondsUntil(scheduledTime)
  const sorted = [...athletes].sort((a, b) => (a.ref || '').localeCompare(b.ref || '') || (a.bibNumber || 0) - (b.bibNumber || 0))

  const matchingWave = eventWaves.find(w => w.startTime === scheduledTime)
  const waveLabel = matchingWave?.name || matchingWave?.label || null

  return (
    <div style={{ flex: 1, background: SURFACE, padding: '14px 28px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: `1px solid ${BORDER}`, paddingBottom: 8, marginBottom: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.12em', color: MUTED }}>{label}</span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 30, color: TEXT }}>{scheduledTime}</span>
          {waveLabel && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, color: MUTED2, textTransform: 'uppercase' }}>{waveLabel}</span>}
        </div>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: MUTED2 }}>
          in {fmtCountdown(Math.max(0, secs))}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, overflow: 'hidden' }}>
        {sorted.map(team => (
          <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 15, color: ACCENT, width: 56, flexShrink: 0 }}>{team.ref || team.bibNumber}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 19, textTransform: 'uppercase', display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{team.name}</span>
              {team.competitionName && (
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, color: ACCENT, textTransform: 'uppercase' }}>{team.competitionName}</span>
              )}
            </div>
            {team.checkedIn
              ? <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: SUCCESS, flexShrink: 0 }}>✓ IN</span>
              : <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: MUTED2, flexShrink: 0 }}>PENDING</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
