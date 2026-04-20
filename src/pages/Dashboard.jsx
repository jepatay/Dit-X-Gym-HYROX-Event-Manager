import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, deleteDoc, doc, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import NavBar from '../components/NavBar'
import { getOrCreateConfig } from '../utils/firestoreUtils'

function deriveStatus(event) {
  const today = new Date().toISOString().substring(0, 10)
  if (event.status === 'live' || event.status === 'past') return event.status
  if (event.date < today) return 'past'
  if (event.date === today) return 'live'
  return 'future'
}

const STATUS_COLORS = {
  future: '#3b82f6',
  live: 'var(--color-accent)',
  past: 'var(--color-text-muted)',
}

export default function Dashboard() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getOrCreateConfig()
    fetchEvents()
  }, [])

  async function fetchEvents() {
    try {
      const q = query(collection(db, 'events'), orderBy('date', 'desc'))
      const snap = await getDocs(q)
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } finally {
      setLoading(false)
    }
  }

  async function deleteEvent(eventId, eventName) {
    if (!confirm(`Delete "${eventName}"? This will also delete all athletes in this event. This cannot be undone.`)) return
    try {
      const teamsSnap = await getDocs(query(collection(db, 'teams'), where('eventId', '==', eventId)))
      await Promise.all(teamsSnap.docs.map(d => deleteDoc(doc(db, 'teams', d.id))))
      await deleteDoc(doc(db, 'events', eventId))
      setEvents(prev => prev.filter(e => e.id !== eventId))
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <h1 style={{ fontSize: 32 }}>Events</h1>
          <button onClick={() => navigate('/event/new')} style={btnPrimary}>
            + New Event
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: 18, marginBottom: 8, fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>No events yet</p>
            <p style={{ fontSize: 14 }}>Create your first event to get started</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.map(event => {
              const status = deriveStatus(event)
              const color = STATUS_COLORS[status]
              return (
                <div key={event.id} style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 200 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: 20 }}>{event.name || 'Untitled Event'}</h2>
                        <span style={{
                          fontSize: 10,
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          padding: '2px 8px',
                          background: color + '22',
                          color,
                          border: `1px solid ${color}44`,
                        }}>
                          {status}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
                          {event.eventType || 'HYROX'}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{event.date}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <ActionLink to={`/event/${event.id}`}>Edit</ActionLink>
                    <ActionLink to={`/event/${event.id}/checkin`}>Check-in</ActionLink>
                    <ActionLink to={`/event/${event.id}/startlist`}>Start List</ActionLink>
                    <ActionLink to={`/event/${event.id}/results`}>Results</ActionLink>
                    <ActionLink to={`/event/${event.id}/qr`}>QR Code</ActionLink>
                    {event.publicSlug && (
                      <ActionLink to={`/e/${event.publicSlug}`} external>Public ↗</ActionLink>
                    )}
                    <button
                      onClick={() => deleteEvent(event.id, event.name || 'Untitled Event')}
                      style={btnDelete}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ActionLink({ to, children, external }) {
  const style = {
    padding: '6px 14px',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-heading)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
    display: 'inline-block',
    background: 'transparent',
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  }
  if (external) {
    return <a href={to} target="_blank" rel="noreferrer" style={style}>{children}</a>
  }
  return <Link to={to} style={style}>{children}</Link>
}

const btnPrimary = {
  padding: '10px 20px',
  background: 'var(--color-accent)',
  color: '#fff',
  border: 'none',
  fontFamily: 'var(--font-heading)',
  fontSize: 14,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
}

const btnDelete = {
  padding: '6px 14px',
  border: '1px solid rgba(230,51,41,0.4)',
  color: 'var(--color-accent)',
  fontFamily: 'var(--font-heading)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: 600,
  background: 'transparent',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
