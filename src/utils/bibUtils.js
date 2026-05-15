export function generateRef(scheduledTime, laneIndex) {
  const timeStr = (scheduledTime || '0000').replace(':', '')
  const laneLetter = String.fromCharCode(65 + (laneIndex || 0))
  return `${timeStr}${laneLetter}`
}

export function nextBibNumber(teams) {
  if (!teams || teams.length === 0) return 100
  const max = Math.max(...teams.map(t => t.bibNumber || 99))
  return max + 1
}
