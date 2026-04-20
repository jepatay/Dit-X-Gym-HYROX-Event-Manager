export function secondsToMMSS(seconds) {
  if (seconds == null) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function secondsToHHMMSS(seconds) {
  if (seconds == null) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function mmssToSeconds(str) {
  const match = str.match(/^(\d{1,3}):(\d{2})$/)
  if (!match) return null
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

export function isValidMMSS(str) {
  return /^\d{1,3}:\d{2}$/.test(str)
}

export function parseTimeInput(str) {
  if (!str) return null
  str = str.trim()
  // HH:MM:SS
  const hms = str.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)
  if (hms) return parseInt(hms[1]) * 3600 + parseInt(hms[2]) * 60 + parseInt(hms[3])
  // MM:SS
  const ms = str.match(/^(\d{1,3}):(\d{2})$/)
  if (ms) return parseInt(ms[1]) * 60 + parseInt(ms[2])
  // Digits only: pad to 6 and parse as HHMMSS
  const digits = str.match(/^(\d{4,6})$/)
  if (digits) {
    const d = str.padStart(6, '0')
    const h = parseInt(d.slice(0, 2))
    const m = parseInt(d.slice(2, 4))
    const s = parseInt(d.slice(4, 6))
    if (m < 60 && s < 60) return h * 3600 + m * 60 + s
  }
  return null
}

export function isValidTimeInput(str) {
  return parseTimeInput(str) !== null
}

export function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + Number(minutes)
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

export function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function waveEndTime(wave) {
  if (!wave.startTime) return '00:00'
  if (wave.isRestWave) {
    return addMinutesToTime(wave.startTime, wave.durationMinutes || 0)
  }
  const teamCount = wave.teamCount || 0
  const interval = wave.intervalMinutes || 0
  return addMinutesToTime(wave.startTime, teamCount * interval)
}

export function wavesOverlap(a, b) {
  const aStart = timeToMinutes(a.startTime)
  const aEnd = timeToMinutes(waveEndTime(a))
  const bStart = timeToMinutes(b.startTime)
  const bEnd = timeToMinutes(waveEndTime(b))
  return aStart < bEnd && bStart < aEnd
}

export function slotTime(waveStartTime, index, intervalMinutes) {
  return addMinutesToTime(waveStartTime, index * intervalMinutes)
}
