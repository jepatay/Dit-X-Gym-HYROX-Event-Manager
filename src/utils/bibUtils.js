export function nextBibNumber(teams) {
  if (!teams || teams.length === 0) return 100
  const max = Math.max(...teams.map(t => t.bibNumber || 99))
  return max + 1
}
