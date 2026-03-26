import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'

const emptyForm = {
  title: '', title_lt: '', description_lt: '',
  ingredients: [''], ingredients_lt: [''],
  steps: [''], steps_lt: [''],
}

export default function RecipeForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    api.get(`/recipes/${id}`).then(r => {
      const d = r.data
      setForm({
        title: d.title, title_lt: d.title_lt, description_lt: d.description_lt,
        ingredients: d.ingredients.length ? d.ingredients : [''],
        ingredients_lt: d.ingredients_lt.length ? d.ingredients_lt : [''],
        steps: d.steps.length ? d.steps : [''],
        steps_lt: d.steps_lt.length ? d.steps_lt : [''],
      })
      if (d.photo) setPhotoPreview(d.photo)
    }).finally(() => setLoading(false))
  }, [id])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const setListItem = (field, index, value) => {
    setForm(f => {
      const arr = [...f[field]]
      arr[index] = value
      return { ...f, [field]: arr }
    })
  }

  const addItem = (field) => setForm(f => ({ ...f, [field]: [...f[field], ''] }))

  const removeItem = (field, index) => setForm(f => ({
    ...f,
    [field]: f[field].filter((_, i) => i !== index),
  }))

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('title_lt', form.title_lt)
      fd.append('description_lt', form.description_lt)
      fd.append('ingredients', JSON.stringify(form.ingredients.filter(Boolean)))
      fd.append('ingredients_lt', JSON.stringify(form.ingredients_lt.filter(Boolean)))
      fd.append('steps', JSON.stringify(form.steps.filter(Boolean)))
      fd.append('steps_lt', JSON.stringify(form.steps_lt.filter(Boolean)))
      if (photo) fd.append('photo', photo)

      if (isEdit) {
        await api.put(`/recipes/${id}`, fd)
      } else {
        await api.post('/recipes/', fd)
      }
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">Loading…</div>

  return (
    <div className="recipe-form-page">
      <h1>{isEdit ? 'Edit Recipe' : 'New Recipe'}</h1>
      <form onSubmit={handleSubmit}>

        {/* Basic info */}
        <div className="form-section">
          <h2>Basic Info</h2>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Title (English)</label>
              <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Title (Lithuanian)</label>
              <input className="form-input" value={form.title_lt} onChange={e => set('title_lt', e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description (Lithuanian)</label>
            <textarea className="form-textarea" value={form.description_lt} onChange={e => set('description_lt', e.target.value)} required />
          </div>
        </div>

        {/* Ingredients */}
        <div className="form-section">
          <h2>Ingredients</h2>
          <div className="dynamic-list">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="form-label" style={{ margin: 0 }}>English</span>
              <span className="form-label" style={{ margin: 0 }}>Lithuanian</span>
              <span />
            </div>
            {form.ingredients.map((item, i) => (
              <div key={i} className="dynamic-row">
                <input
                  className="form-input"
                  placeholder={`Ingredient ${i + 1}`}
                  value={item}
                  onChange={e => setListItem('ingredients', i, e.target.value)}
                />
                <input
                  className="form-input"
                  placeholder={`Ingredientas ${i + 1}`}
                  value={form.ingredients_lt[i] ?? ''}
                  onChange={e => setListItem('ingredients_lt', i, e.target.value)}
                />
                <button type="button" className="remove-btn" onClick={() => {
                  removeItem('ingredients', i)
                  removeItem('ingredients_lt', i)
                }} disabled={form.ingredients.length === 1}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="add-btn" onClick={() => { addItem('ingredients'); addItem('ingredients_lt') }}>
            + Add ingredient
          </button>
        </div>

        {/* Steps */}
        <div className="form-section">
          <h2>Steps</h2>
          <div className="dynamic-list">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="form-label" style={{ margin: 0 }}>English</span>
              <span className="form-label" style={{ margin: 0 }}>Lithuanian</span>
              <span />
            </div>
            {form.steps.map((step, i) => (
              <div key={i} className="dynamic-row">
                <input
                  className="form-input"
                  placeholder={`Step ${i + 1}`}
                  value={step}
                  onChange={e => setListItem('steps', i, e.target.value)}
                />
                <input
                  className="form-input"
                  placeholder={`Žingsnis ${i + 1}`}
                  value={form.steps_lt[i] ?? ''}
                  onChange={e => setListItem('steps_lt', i, e.target.value)}
                />
                <button type="button" className="remove-btn" onClick={() => {
                  removeItem('steps', i)
                  removeItem('steps_lt', i)
                }} disabled={form.steps.length === 1}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="add-btn" onClick={() => { addItem('steps'); addItem('steps_lt') }}>
            + Add step
          </button>
        </div>

        {/* Photo */}
        <div className="form-section">
          <h2>Photo</h2>
          <label className="photo-upload-area">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="photo-preview" />
            ) : null}
            <div className="photo-label">
              {photoPreview ? 'Click to change photo' : 'Click to upload photo (JPG, PNG, WebP)'}
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          </label>
        </div>

        {error && <p className="error-msg">{error}</p>}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Recipe'}
          </button>
        </div>
      </form>
    </div>
  )
}
