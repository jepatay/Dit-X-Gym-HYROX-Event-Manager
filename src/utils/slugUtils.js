export function generateSlug(name, date) {
  const year = date ? date.substring(0, 4) : new Date().getFullYear()
  const base = (name || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  return `${base}-${year}`
}
