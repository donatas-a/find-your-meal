import { useState, useEffect } from 'react'
import api from '../api/client'

// Dialog: read recipe photos with free OCR, review the text, then let Kimi
// turn it into a recipe. Calls onImported(recipe) when a recipe is saved.
export default function ImportFromPictureDialog({ open, onClose, onImported }) {
  const [photos, setPhotos] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState('') // '', 'reading', 'importing'
  const [error, setError] = useState('')

  const close = () => { if (!busy) onClose() }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, busy])

  if (!open) return null

  const addPhotos = (e) => {
    const files = Array.from(e.target.files || [])
    setPhotos(prev => [...prev, ...files])
    e.target.value = ''  // allow picking the same file again
  }

  const movePhoto = (i, dir) => setPhotos(prev => {
    const j = i + dir
    if (j < 0 || j >= prev.length) return prev
    const next = [...prev]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })

  const removePhoto = (i) => setPhotos(prev => prev.filter((_, k) => k !== i))

  const readPhotos = async () => {
    if (!photos.length) return
    setBusy('reading')
    setError('')
    try {
      const form = new FormData()
      photos.forEach(f => form.append('photos', f))
      const { data } = await api.post('/recipes/ocr-photos', form)
      setText(prev => (prev.trim() ? prev.trim() + '\n\n' : '') + data.text)
      setPhotos([])
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not read the photos.')
    } finally {
      setBusy('')
    }
  }

  const importRecipe = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy('importing')
    setError('')
    try {
      const { data } = await api.post('/recipes/import-text', { text: text.trim() })
      setText('')
      setPhotos([])
      onImported(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Import failed.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="import-dialog-title">
        <div className="dialog-header">
          <h2 id="import-dialog-title">Import from picture</h2>
          <button type="button" className="dialog-close" onClick={close} disabled={!!busy} aria-label="Close">×</button>
        </div>

        <div className="dialog-step">
          <span className="dialog-step-num">1</span>
          <div className="dialog-step-body">
            <div className="import-photo-head">
              <label className={`btn btn-outline btn-sm${busy ? ' disabled' : ''}`}>
                + Add recipe photos
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple
                  style={{ display: 'none' }} onChange={addPhotos} disabled={!!busy} />
              </label>
              <button className="btn btn-outline btn-sm" type="button" onClick={readPhotos} disabled={!!busy || !photos.length}>
                {busy === 'reading' ? 'Reading…' : photos.length > 1 ? `Read text from ${photos.length} photos` : 'Read text from photo'}
              </button>
            </div>
            {photos.length > 0 && (
              <ol className="import-photo-list">
                {photos.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    <span className="import-photo-name">{i + 1}. {f.name}</span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => movePhoto(i, -1)} disabled={i === 0} title="Move up">↑</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => movePhoto(i, 1)} disabled={i === photos.length - 1} title="Move down">↓</button>
                    <button type="button" className="remove-btn" onClick={() => removePhoto(i)} title="Remove">×</button>
                  </li>
                ))}
              </ol>
            )}
            <p className="form-hint">Recipe spans several pages? Add all photos in page order.</p>
          </div>
        </div>

        <form className="dialog-step" onSubmit={importRecipe}>
          <span className="dialog-step-num">2</span>
          <div className="dialog-step-body">
            <textarea
              className="form-textarea"
              placeholder="The text from your photos appears here. Check it and fix any mistakes — or paste recipe text directly."
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={!!busy}
              rows={10}
            />
            {error && <div className="import-error">{error}</div>}
            <div className="dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={close} disabled={!!busy}>Cancel</button>
              <button className="btn btn-primary" type="submit" disabled={!!busy || !text.trim()}>
                {busy === 'importing' ? 'Importing…' : 'Import recipe'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
