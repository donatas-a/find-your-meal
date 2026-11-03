import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import DishPlaceholder from '../components/DishPlaceholder'

export default function AdminDashboard() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [importText, setImportText] = useState('')
  const [ocrPhotos, setOcrPhotos] = useState([])
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const navigate = useNavigate()

  const fetchRecipes = () => {
    api.get('/recipes/').then(r => setRecipes(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchRecipes() }, [])

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return
    await api.delete(`/recipes/${id}`)
    setRecipes(prev => prev.filter(r => r.id !== id))
  }

  const handleImportText = async (e) => {
    e.preventDefault()
    if (!importText.trim()) return
    setImporting(true)
    setImportError('')
    try {
      const { data } = await api.post('/recipes/import-text', { text: importText.trim() })
      setRecipes(prev => [data, ...prev])
      setImportText('')
    } catch (err) {
      setImportError(err.response?.data?.detail || 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  const addOcrPhotos = (e) => {
    const files = Array.from(e.target.files || [])
    setOcrPhotos(prev => [...prev, ...files])
    e.target.value = ''  // allow picking the same file again
  }

  const movePhoto = (i, dir) => setOcrPhotos(prev => {
    const j = i + dir
    if (j < 0 || j >= prev.length) return prev
    const next = [...prev]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })

  const removePhoto = (i) => setOcrPhotos(prev => prev.filter((_, k) => k !== i))

  const handleOcrPhotos = async () => {
    if (!ocrPhotos.length) return
    setImporting(true)
    setImportError('')
    try {
      const form = new FormData()
      ocrPhotos.forEach(f => form.append('photos', f))
      const { data } = await api.post('/recipes/ocr-photos', form)
      setImportText(prev => (prev.trim() ? prev.trim() + '\n\n' : '') + data.text)
      setOcrPhotos([])
    } catch (err) {
      setImportError(err.response?.data?.detail || 'Could not read the photos.')
    } finally {
      setImporting(false)
    }
  }

  if (loading) return <div className="loading">Loading…</div>

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Manage Recipes</h1>
        <button className="btn btn-primary" onClick={() => navigate('/admin/new')}>
          + Add Recipe
        </button>
      </div>

      {importError && <div className="import-error">{importError}</div>}

      <form className="import-text-form" onSubmit={handleImportText}>
        <textarea
          className="form-textarea"
          placeholder="Paste recipe text here, or read it from photos below"
          value={importText}
          onChange={e => setImportText(e.target.value)}
          disabled={importing}
          rows={8}
        />
        <button className="btn btn-outline btn-sm" type="submit" disabled={importing || !importText.trim()}>
          {importing ? 'Importing…' : 'Import from text'}
        </button>
      </form>

      <div className="import-photo-box">
        <div className="import-photo-head">
          <label className={`btn btn-outline btn-sm${importing ? ' disabled' : ''}`}>
            + Add recipe photos
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={{ display: 'none' }}
              onChange={addOcrPhotos}
              disabled={importing}
            />
          </label>
          <button className="btn btn-outline btn-sm" type="button" onClick={handleOcrPhotos} disabled={importing || !ocrPhotos.length}>
            {importing ? 'Reading…' : ocrPhotos.length > 1 ? `Read text from ${ocrPhotos.length} photos` : 'Read text from photo'}
          </button>
        </div>
        {ocrPhotos.length > 0 && (
          <ol className="import-photo-list">
            {ocrPhotos.map((f, i) => (
              <li key={`${f.name}-${i}`}>
                <span className="import-photo-name">{i + 1}. {f.name}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => movePhoto(i, -1)} disabled={i === 0} title="Move up">↑</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => movePhoto(i, 1)} disabled={i === ocrPhotos.length - 1} title="Move down">↓</button>
                <button type="button" className="remove-btn" onClick={() => removePhoto(i)} title="Remove">×</button>
              </li>
            ))}
          </ol>
        )}
        <p className="form-hint">Recipe spans several pages? Add all photos in page order. The text appears in the box above — check it, then click Import from text.</p>
      </div>

      {recipes.length === 0 ? (
        <div className="empty-state">No recipes yet. Add your first one!</div>
      ) : (
        <div className="admin-list">
          {recipes.map(r => (
            <div key={r.id} className="admin-item">
              {r.photo ? (
                <img src={r.photo} alt={r.title} className="admin-item-thumb" />
              ) : (
                <DishPlaceholder seed={r.id} title={r.title_lt} compact className="admin-item-placeholder" />
              )}
              <div className="admin-item-info">
                <div className="admin-item-title">{r.title}</div>
                <div className="admin-item-title-lt">{r.title_lt}</div>
              </div>
              <div className="admin-item-actions">
                <button className="btn btn-outline btn-sm" style={{ color: '#1a1a1a', borderColor: '#e5e7eb' }} onClick={() => navigate(`/admin/edit/${r.id}`)}>
                  Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id, r.title)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
