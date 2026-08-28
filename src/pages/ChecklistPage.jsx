import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { doc, getDoc, getDocFromServer, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import ChecklistPanel from '../components/ChecklistPanel'

export default function ChecklistPage() {
  const { id } = useParams()
  const user = useAuth()
  const [event, setEvent] = useState(null)
  const [eventLoaded, setEventLoaded] = useState(false)
  const [config, setConfig] = useState(null)
  const [checklist, setChecklist] = useState({})
  const [saved, setSaved] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const [evSnap, configSnap] = await Promise.all([
          getDocFromServer(doc(db, 'events', id)),
          getDoc(doc(db, 'config', 'main')),
        ])
        if (evSnap.exists()) {
          const data = evSnap.data()
          setEvent({ id: evSnap.id, ...data })
          setChecklist(data.checklist || {})
        }
        if (configSnap.exists()) setConfig(configSnap.data())
      } finally {
        setEventLoaded(true)
      }
    }
    load()
  }, [id])

  async function save() {
    await updateDoc(doc(db, 'events', id), { checklist })
    setSaved(s => s + 1)
  }

  // Coaches (logged in) always get in. Everyone else needs the event's
  // organizer-controlled "no login" checklist access switched on.
  if (user === undefined || !eventLoaded) {
    return <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }} />
  }
  if (!event) {
    return (
      <div style={{ background: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Event not found.
      </div>
    )
  }
  if (!user && event.publicChecklistEnabled !== true) {
    return <Navigate to="/login" replace />
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--color-surface)', borderBottom: '3px solid var(--color-accent)', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 11, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Checklist</div>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 22, color: 'var(--color-text)', lineHeight: 1.1 }}>{event.name || '...'}</div>
      </div>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '24px 20px' }}>
        <ChecklistPanel checklist={checklist} setChecklist={setChecklist} config={config} onSave={save} saved={saved} />
      </div>
    </div>
  )
}
