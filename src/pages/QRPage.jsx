import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { QRCodeSVG } from 'qrcode.react'
import { db } from '../firebase'
import NavBar from '../components/NavBar'

export default function QRPage() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'events', id)).then(snap => {
      if (snap.exists()) setEvent(snap.data())
      setLoading(false)
    })
  }, [id])

  const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin
  const publicUrl = event?.publicSlug ? `${baseUrl}/e/${event.publicSlug}` : ''

  if (loading) return <div><NavBar /><p style={{ padding: 32, color: 'var(--color-text-muted)' }}>Loading...</p></div>

  return (
    <div>
      <div className="no-print">
        <NavBar />
      </div>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
        <div className="no-print" style={{ marginBottom: 24 }}>
          <Link to={`/event/${id}`} style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ← {event?.name || 'Event'}
          </Link>
        </div>

        {!publicUrl ? (
          <p style={{ color: 'var(--color-text-muted)' }}>
            No public URL yet — save the event info first to generate a public slug.
          </p>
        ) : (
          <>
            <div style={{ display: 'inline-block', padding: 24, background: '#fff', marginBottom: 24 }}>
              <QRCodeSVG
                value={publicUrl}
                size={280}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 32, marginBottom: 8 }}>{event?.name}</h1>
              <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontSize: 14 }}>{event?.date}</p>
              <p style={{ marginTop: 12, fontSize: 16, color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Scan for start times &amp; maps
              </p>
            </div>

            <div className="no-print" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
              <button
                onClick={() => window.print()}
                style={btnPrimary}
              >
                Print QR Code
              </button>
              <a href={publicUrl} target="_blank" rel="noreferrer" style={{ ...btnSecondary, textDecoration: 'none' }}>
                Open Public Page ↗
              </a>
            </div>

            <p className="no-print" style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {publicUrl}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const btnPrimary = { padding: '10px 24px', background: 'var(--color-accent)', color: '#fff', border: 'none', fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }
const btnSecondary = { padding: '10px 24px', background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-heading)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', display: 'inline-block' }
