import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function AdminDashboard() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [importUrl, setImportUrl] = useState('')
  const [importText, setImportText] = useState('')
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

  const handleImport = async (e) => {
    e.preventDefault()
    if (!importUrl.trim()) return
    setImporting(true)
    setImportError('')
    try {
      const { data } = await api.post('/recipes/import-url', { url: importUrl.trim() })
      setRecipes(prev => [data, ...prev])
      setImportUrl('')
    } catch (err) {
      setImportError(err.response?.data?.detail || 'Import failed. This site may not support recipe import.')
    } finally {
      setImporting(false)
    }
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

  if (loading) return <div className="loading">Loading…</div>

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Manage Recipes</h1>
        <button className="btn btn-primary" onClick={() => navigate('/admin/new')}>
          + Add Recipe
        </button>
      </div>

      <form className="import-url-form" onSubmit={handleImport}>
        <input
          type="url"
          className="form-input"
          placeholder="Paste recipe URL to import (e.g. allrecipes.com/recipe/...)"
          value={importUrl}
          onChange={e => setImportUrl(e.target.value)}
          disabled={importing}
        />
        <button className="btn btn-outline btn-sm" type="submit" disabled={importing || !importUrl.trim()}>
          {importing ? 'Importing…' : 'Import from URL'}
        </button>
      </form>
      {importError && <div className="import-error">{importError}</div>}

      <form className="import-text-form" onSubmit={handleImportText}>
        <textarea
          className="form-textarea"
          placeholder="Or paste recipe text here (works with any website — copy the full recipe text and paste it)"
          value={importText}
          onChange={e => setImportText(e.target.value)}
          disabled={importing}
          rows={4}
        />
        <button className="btn btn-outline btn-sm" type="submit" disabled={importing || !importText.trim()}>
          {importing ? 'Importing…' : 'Import from text'}
        </button>
      </form>

      {recipes.length === 0 ? (
        <div className="empty-state">No recipes yet. Add your first one!</div>
      ) : (
        <div className="admin-list">
          {recipes.map(r => (
            <div key={r.id} className="admin-item">
              {r.photo ? (
                <img src={r.photo} alt={r.title} className="admin-item-thumb" />
              ) : (
                <div className="admin-item-placeholder">🍽️</div>
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
