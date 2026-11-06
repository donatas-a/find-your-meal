import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import DishPlaceholder from '../components/DishPlaceholder'
import ImportFromPictureDialog from '../components/ImportFromPictureDialog'
import { useAdminLang } from '../context/AdminLang'

export default function AdminDashboard() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [importOpen, setImportOpen] = useState(false)
  const navigate = useNavigate()
  const { t } = useAdminLang()

  const fetchRecipes = () => {
    api.get('/recipes/').then(r => setRecipes(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchRecipes() }, [])

  const handleDelete = async (id, title) => {
    if (!window.confirm(t('dash.confirmDelete', { title }))) return
    await api.delete(`/recipes/${id}`)
    setRecipes(prev => prev.filter(r => r.id !== id))
  }

  const handleImported = (recipe) => {
    setRecipes(prev => [recipe, ...prev])
    setImportOpen(false)
  }

  if (loading) return <div className="loading">{t('loading')}</div>

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">{t('dash.title')}</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setImportOpen(true)}>
            {t('dash.import')}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/admin/new')}>
            {t('dash.add')}
          </button>
        </div>
      </div>

      <ImportFromPictureDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={handleImported}
      />

      {recipes.length === 0 ? (
        <div className="empty-state">{t('dash.empty')}</div>
      ) : (
        <div className="admin-list">
          {recipes.map(r => (
            <div key={r.id} className="admin-item">
              {r.photo ? (
                <img src={r.photo} alt={r.title_lt} className="admin-item-thumb" />
              ) : (
                <DishPlaceholder seed={r.id} title={r.title_lt} compact className="admin-item-placeholder" />
              )}
              <div className="admin-item-info">
                <div className="admin-item-title">{r.title_lt}</div>
                <div className="admin-item-title-lt">{r.title}</div>
              </div>
              <div className="admin-item-actions">
                <button className="btn btn-outline btn-sm" style={{ color: '#1a1a1a', borderColor: '#e5e7eb' }} onClick={() => navigate(`/admin/edit/${r.id}`)}>
                  {t('dash.edit')}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id, r.title_lt)}>
                  {t('dash.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
