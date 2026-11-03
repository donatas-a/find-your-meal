// Shown instead of a dish photo: a plate with the recipe's initial, with
// cutlery on each side. The color is chosen from the recipe id so the same
// recipe always gets the same color.
const PALETTES = [
  { bg: '#dfe8d6', line: '#9fb594', ring: '#c9d8c0', text: '#405839' }, // sage
  { bg: '#f2ddd0', line: '#d3a993', ring: '#ecccbb', text: '#8e4e34' }, // terracotta
  { bg: '#efe6d2', line: '#c8b78c', ring: '#e3d7b8', text: '#6b5a32' }, // oat
  { bg: '#dde6ea', line: '#9fb3bd', ring: '#c6d5dc', text: '#3e5a66' }, // dusty blue
]

export default function DishPlaceholder({ seed = 0, title = '', compact = false, className = '' }) {
  const p = PALETTES[Math.abs(Number(seed) || 0) % PALETTES.length]
  const initial = (title.trim()[0] || '').toLocaleUpperCase('lt')

  return (
    <div className={`dish-placeholder ${className}`} style={{ background: p.bg }} aria-hidden="true">
      <svg viewBox={compact ? '24 24 112 112' : '0 0 160 160'} className="dish-placeholder-svg">
        {!compact && (
          <g fill="none" stroke={p.line} strokeWidth="3" strokeLinecap="round">
            <line x1="14" y1="40" x2="14" y2="120" />
            <path d="M8 40v22a6 6 0 0 0 12 0V40" />
            <path d="M146 40c-6 8-6 26 0 32v48" />
          </g>
        )}
        <circle cx="80" cy="80" r="56" fill="#fbf9f7" />
        <circle cx="80" cy="80" r="42" fill="none" stroke={p.ring} strokeWidth="2" />
        <text x="80" y="95" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize="44" fill={p.text}>
          {initial}
        </text>
      </svg>
    </div>
  )
}
