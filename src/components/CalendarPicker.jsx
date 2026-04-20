import { useState } from 'react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export default function CalendarPicker({ value, onChange }) {
  const today = new Date()
  const initDate = value ? new Date(value + 'T00:00:00') : today
  const [viewYear, setViewYear] = useState(initDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initDate.getMonth())
  const [open, setOpen] = useState(false)

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  function selectDay(day) {
    const m = String(viewMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    onChange(`${viewYear}-${m}-${d}`)
    setOpen(false)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const selDay = value ? parseInt(value.substring(8, 10)) : null
  const selMonth = value ? parseInt(value.substring(5, 7)) - 1 : null
  const selYear = value ? parseInt(value.substring(0, 4)) : null
  const isSelected = (day) => selDay === day && selMonth === viewMonth && selYear === viewYear

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '10px 14px',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          color: value ? 'var(--color-text)' : 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          cursor: 'pointer',
          minWidth: 160,
          textAlign: 'left',
        }}
      >
        {value || 'Select date'}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 4,
          background: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border)',
          zIndex: 300,
          padding: 16,
          minWidth: 268,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button type="button" onClick={prevMonth} style={navBtn}>{'‹'}</button>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700 }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} style={navBtn}>{'›'}</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
            {DAYS.map(d => (
              <div key={d} style={{
                textAlign: 'center',
                fontSize: 10,
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-heading)',
                padding: '4px 0',
              }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const selected = isSelected(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  style={{
                    padding: '6px 0',
                    background: selected ? 'var(--color-accent)' : 'transparent',
                    border: 'none',
                    color: selected ? '#fff' : 'var(--color-text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const navBtn = {
  background: 'transparent',
  border: 'none',
  color: 'var(--color-text)',
  fontSize: 20,
  cursor: 'pointer',
  padding: '2px 8px',
  lineHeight: 1,
}
