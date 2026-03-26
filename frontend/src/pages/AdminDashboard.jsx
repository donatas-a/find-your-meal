import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function AdminDashboard() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
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

  if (loading) return <div className="loading">Loading…</div>

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Manage Recipes</h1>
        <button className="btn btn-primary" onClick={() => navigate('/admin/new')}>
          + Add Recipe
        </button>
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
