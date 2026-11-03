// Must match UNITS in backend/app/ingredients.py
export const UNITS = [
  { key: '', en: '—', lt: '—' },
  { key: 'g', en: 'g', lt: 'g' },
  { key: 'kg', en: 'kg', lt: 'kg' },
  { key: 'ml', en: 'ml', lt: 'ml' },
  { key: 'l', en: 'l', lt: 'l' },
  { key: 'tsp', en: 'tsp', lt: 'a. š.' },
  { key: 'tbsp', en: 'tbsp', lt: 'v. š.' },
  { key: 'cup', en: 'cup', lt: 'stikl.' },
  { key: 'pcs', en: 'pcs', lt: 'vnt.' },
  { key: 'pinch', en: 'pinch', lt: 'žiupsn.' },
  { key: 'clove', en: 'clove', lt: 'skilt.' },
  { key: 'pack', en: 'pack', lt: 'pak.' },
  { key: 'can', en: 'can', lt: 'skard.' },
]

export const unitLabel = (key, lang = 'en') => {
  if (!key) return ''
  const u = UNITS.find(u => u.key === key)
  return u ? u[lang] : key
}

export const formatIngredient = (item, lang = 'en') =>
  [item.amount, unitLabel(item.unit, lang), lang === 'en' ? item.name : item.name_lt]
    .filter(Boolean).join(' ')
