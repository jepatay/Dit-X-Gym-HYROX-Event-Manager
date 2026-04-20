import { useEffect, useState } from 'react'

export default function SaveConfirmation({ trigger }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!trigger) return
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [trigger])

  if (!visible) return null

  return (
    <span style={{
      color: 'var(--color-success)',
      fontFamily: 'var(--font-heading)',
      fontSize: 14,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      animation: 'fadeOut 3s forwards',
    }}>
      Saved ✓
    </span>
  )
}
