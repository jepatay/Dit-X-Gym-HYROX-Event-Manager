import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function NavBar() {
  const navigate = useNavigate()
  const user = useAuth()

  async function handleSignOut() {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <nav className="no-print" style={{
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <Link to="/" style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 20,
          fontWeight: 800,
          color: 'var(--color-accent)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          DIT X-GYM
        </Link>
        <Link to="/" style={navLinkStyle}>Events</Link>
        <Link to="/statistics" style={navLinkStyle}>Statistics</Link>
        <Link to="/settings" style={navLinkStyle}>Settings</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={handleSignOut} style={{
          background: 'transparent',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          padding: '6px 14px',
          fontFamily: 'var(--font-heading)',
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          cursor: 'pointer',
        }}>
          Sign Out
        </button>
      </div>
    </nav>
  )
}

const navLinkStyle = {
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-heading)',
  fontSize: 14,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: 600,
}
