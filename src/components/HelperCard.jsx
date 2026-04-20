import { useRef, useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'

export default function HelperCard({ helper, index, onUpdate, onDelete }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const storageRef = ref(storage, `helpers/${Date.now()}-${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      onUpdate(index, { ...helper, photoUrl: url })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{
      background: 'var(--color-surface-raised)',
      border: '1px solid var(--color-border)',
      padding: 16,
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
    }}>
      <div style={{ flexShrink: 0 }}>
        {helper.photoUrl ? (
          <img
            src={helper.photoUrl}
            alt={helper.name}
            style={{ width: 64, height: 64, objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: 64,
            height: 64,
            background: 'var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 24,
          }}>?</div>
        )}
        <button
          type="button"
          onClick={() => fileRef.current.click()}
          disabled={uploading}
          style={{
            marginTop: 6,
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
            fontSize: 11,
            padding: '3px 8px',
            cursor: 'pointer',
            fontFamily: 'var(--font-heading)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            width: '100%',
          }}
        >
          {uploading ? '...' : 'Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input
          value={helper.name || ''}
          onChange={e => onUpdate(index, { ...helper, name: e.target.value })}
          placeholder="Name"
          style={inputStyle}
        />
        <input
          value={helper.role || ''}
          onChange={e => onUpdate(index, { ...helper, role: e.target.value })}
          placeholder="Role (e.g. Head Coach)"
          style={inputStyle}
        />
        <input
          value={helper.station || ''}
          onChange={e => onUpdate(index, { ...helper, station: e.target.value })}
          placeholder="Station (e.g. Wall Balls)"
          style={{ ...inputStyle, gridColumn: '1 / -1' }}
        />
      </div>

      <button
        type="button"
        onClick={() => onDelete(index)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-muted)',
          fontSize: 18,
          cursor: 'pointer',
          padding: '4px',
          flexShrink: 0,
        }}
      >✕</button>
    </div>
  )
}

const inputStyle = {
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  padding: '8px 10px',
  fontSize: 13,
  width: '100%',
}
