import { Link, useLocation } from 'react-router-dom'
import NavBar from './NavBar'

export default function EventNav({ id, eventName, publicSlug }) {
  const { pathname } = useLocation()

  const tabs = [
    { path: `/event/${id}/checkin`, label: 'Check-in' },
    { path: `/event/${id}/startlist`, label: 'Start List' },
    { path: `/event/${id}/results`, label: 'Results' },
    { path: `/event/${id}/qr`, label: 'QR Code' },
  ]

  return (
    <>
      <NavBar />
      <div className="no-print" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="hide-scrollbar" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'stretch', overflowX: 'auto' }}>
          <Link to="/" style={{
            padding: '10px 14px',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-heading)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '2px solid transparent',
            marginBottom: -1,
          }}>← Events</Link>
          {eventName && (
            <span style={{
              padding: '10px 8px 10px 4px',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-heading)',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              opacity: 0.5,
            }}>/ {eventName}</span>
          )}
          <div style={{ display: 'flex', marginLeft: 8 }}>
            {tabs.map(tab => {
              const active = pathname === tab.path
              return (
                <Link key={tab.path} to={tab.path} style={{
                  padding: '10px 14px',
                  color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
                  marginBottom: -1,
                  display: 'flex',
                  alignItems: 'center',
                }}>{tab.label}</Link>
              )
            })}
            {publicSlug && (
              <a
                href={`/e/${publicSlug}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '10px 14px',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  borderBottom: '2px solid transparent',
                  marginBottom: -1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >Public ↗</a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
