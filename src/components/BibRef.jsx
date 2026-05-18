// Splits a ref like "0900A" — time digits in accent color, trailing letter in text color
export function BibRef({ value, bibNumber, color }) {
  if (value) {
    return (
      <>
        <span style={{ color }}>{value.slice(0, -1)}</span>
        <span style={{ color: 'var(--color-text, #fff)' }}>{value.slice(-1)}</span>
      </>
    )
  }
  return <span style={{ color }}>{bibNumber != null ? `#${bibNumber}` : null}</span>
}
