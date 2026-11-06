import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
import { UNITS, formatIngredient } from '../units'
import { useAdminLang } from '../context/AdminLang'

const emptyIngredient = () => ({ amount: '', unit: '', name: '', name_lt: '' })

const emptyForm = {
  title: '', title_lt: '', description_lt: '',
  ingredients: [emptyIngredient()],
  steps: [''], steps_lt: [''],
  calories: '', protein_g: '', serving_weight_g: '', servings: '4',
}

export default function RecipeForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { t } = useAdminLang()

  const [form, setForm] = useState(emptyForm)
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    api.get(`/recipes/${id}`).then(r => {
      const d = r.data
      setForm({
        title: d.title, title_lt: d.title_lt, description_lt: d.description_lt,
        ingredients: d.ingredient_items?.length ? d.ingredient_items : [emptyIngredient()],
        steps: d.steps.length ? d.steps : [''],
        steps_lt: d.steps_lt.length ? d.steps_lt : [''],
        calories: d.calories ?? '',
        protein_g: d.protein_g ?? '',
        serving_weight_g: d.serving_weight_g ?? '',
        servings: String(d.servings ?? 4),
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

  const setIngredient = (index, key, value) => setForm(f => {
    const arr = [...f.ingredients]
    arr[index] = { ...arr[index], [key]: value }
    return { ...f, ingredients: arr }
  })

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

  const handleEstimateNutrition = async () => {
    setEstimateError('')
    const ingredients = form.ingredients.filter(i => i.name.trim()).map(i => formatIngredient(i, 'en'))
    if (!ingredients.length) {
      setEstimateError(t('form.addFirst'))
      return
    }
    setEstimating(true)
    try {
      const r = await api.post('/recipes/estimate-nutrition', {
        ingredients,
        servings: Number(form.servings) || 1,
      })
      const skipped = r.data.skipped || []
      setEstimateError(skipped.length ? t('form.notCounted', { list: skipped.join('; ') }) : '')
      setForm(f => ({
        ...f,
        calories: String(r.data.calories),
        protein_g: String(r.data.protein_g),
        serving_weight_g: String(r.data.serving_weight_g),
      }))
    } catch (err) {
      setEstimateError(err.response?.data?.detail || t('form.estimateFailed'))
    } finally {
      setEstimating(false)
    }
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
      fd.append('ingredient_items', JSON.stringify(form.ingredients.filter(i => i.name.trim() || i.name_lt.trim())))
      fd.append('steps', JSON.stringify(form.steps.filter(Boolean)))
      fd.append('steps_lt', JSON.stringify(form.steps_lt.filter(Boolean)))
      if (form.calories !== '') fd.append('calories', form.calories)
      if (form.protein_g !== '') fd.append('protein_g', form.protein_g)
      if (form.serving_weight_g !== '') fd.append('serving_weight_g', form.serving_weight_g)
      if (form.servings !== '') fd.append('servings', Math.max(1, Math.round(Number(form.servings)) || 1))
      if (photo) fd.append('photo', photo)

      setSaved(false)
      if (isEdit) {
        const { data } = await api.put(`/recipes/${id}`, fd)
        // Stay on the page: show the saved photo and confirm.
        setPhoto(null)
        if (data.photo) setPhotoPreview(data.photo)
        setSaved(true)
        setTimeout(() => setSaved(false), 4000)
      } else {
        // New recipe: continue on its edit page so saving again doesn't create a duplicate.
        const { data } = await api.post('/recipes/', fd)
        navigate(`/admin/edit/${data.id}`, { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.detail || t('form.wrong'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">{t('loading')}</div>

  return (
    <div className="recipe-form-page">
      <h1>{isEdit ? t('form.edit') : t('form.new')}</h1>
      <form onSubmit={handleSubmit}>

        {/* Basic info */}
        <div className="form-section">
          <h2>{t('form.basic')}</h2>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('form.titleLt')}</label>
              <input className="form-input" value={form.title_lt} onChange={e => set('title_lt', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('form.titleEn')}</label>
              <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('form.descLt')}</label>
            <textarea className="form-textarea" value={form.description_lt} onChange={e => set('description_lt', e.target.value)} required />
          </div>
        </div>

        {/* Ingredients */}
        <div className="form-section">
          <h2>{t('form.ingredients')}</h2>
          <div className="dynamic-list">
            <div className="ingredient-row ingredient-head">
              <span className="form-label">{t('form.amount')}</span>
              <span className="form-label">{t('form.unit')}</span>
              <span className="form-label">{t('form.lt')}</span>
              <span className="form-label">{t('form.en')}</span>
              <span />
            </div>
            {form.ingredients.map((item, i) => (
              <div key={i} className="ingredient-row">
                <input
                  className="form-input ing-amount"
                  placeholder={t('form.qty')}
                  value={item.amount}
                  onChange={e => setIngredient(i, 'amount', e.target.value)}
                />
                <select
                  className="form-input ing-unit"
                  value={item.unit}
                  onChange={e => setIngredient(i, 'unit', e.target.value)}
                >
                  {UNITS.map(u => (
                    <option key={u.key} value={u.key}>{u.key ? (u.en === u.lt ? u.en : `${u.en} / ${u.lt}`) : '—'}</option>
                  ))}
                </select>
                <input
                  className="form-input ing-name-lt"
                  placeholder={`Ingredientas ${i + 1}`}
                  value={item.name_lt}
                  onChange={e => setIngredient(i, 'name_lt', e.target.value)}
                />
                <input
                  className="form-input ing-name"
                  placeholder={`Ingredient ${i + 1}`}
                  value={item.name}
                  onChange={e => setIngredient(i, 'name', e.target.value)}
                />
                <button type="button" className="remove-btn ing-remove" onClick={() => removeItem('ingredients', i)}
                  disabled={form.ingredients.length === 1}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="add-btn" onClick={() => setForm(f => ({ ...f, ingredients: [...f.ingredients, emptyIngredient()] }))}>
            {t('form.addIngredient')}
          </button>
        </div>

        {/* Steps */}
        <div className="form-section">
          <h2>{t('form.steps')}</h2>
          <div className="dynamic-list">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="form-label" style={{ margin: 0 }}>{t('form.lt')}</span>
              <span className="form-label" style={{ margin: 0 }}>{t('form.en')}</span>
              <span />
            </div>
            {form.steps.map((step, i) => (
              <div key={i} className="dynamic-row">
                <input
                  className="form-input"
                  placeholder={`Žingsnis ${i + 1}`}
                  value={form.steps_lt[i] ?? ''}
                  onChange={e => setListItem('steps_lt', i, e.target.value)}
                />
                <input
                  className="form-input"
                  placeholder={`Step ${i + 1}`}
                  value={step}
                  onChange={e => setListItem('steps', i, e.target.value)}
                />
                <button type="button" className="remove-btn" onClick={() => {
                  removeItem('steps', i)
                  removeItem('steps_lt', i)
                }} disabled={form.steps.length === 1}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="add-btn" onClick={() => { addItem('steps'); addItem('steps_lt') }}>
            {t('form.addStep')}
          </button>
        </div>

        {/* Nutrition */}
        <div className="form-section">
          <h2>{t('form.nutrition')}</h2>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">{t('form.servings')}</label>
              <input className="form-input" type="number" min="1" step="1" value={form.servings} onChange={e => set('servings', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={handleEstimateNutrition} disabled={estimating} style={{ alignSelf: 'flex-start' }}>
                {estimating ? t('form.estimating') : t('form.estimate')}
              </button>
              <span className="form-hint">{t('form.estimateHint')}</span>
            </div>
          </div>
          {estimateError && <p className="error-msg">{estimateError}</p>}
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">{t('form.calories')}</label>
              <input className="form-input" type="number" min="0" value={form.calories} onChange={e => set('calories', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('form.protein')}</label>
              <input className="form-input" type="number" min="0" step="0.1" value={form.protein_g} onChange={e => set('protein_g', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('form.weight')}</label>
              <input className="form-input" type="number" min="0" value={form.serving_weight_g} onChange={e => set('serving_weight_g', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Photo */}
        <div className="form-section">
          <h2>{t('form.photo')}</h2>
          <label className="photo-upload-area">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="photo-preview" />
            ) : null}
            <div className="photo-label">
              {photoPreview ? t('form.changePhoto') : t('form.uploadPhoto')}
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          </label>
        </div>

        {error && <p className="error-msg">{error}</p>}
        {saved && <p style={{ color: 'var(--primary)', fontWeight: 600, textAlign: 'center', marginTop: '0.5rem' }}>{t('form.saved')}</p>}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin')}>{t('form.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t('form.saving') : isEdit ? t('form.save') : t('form.create')}
          </button>
        </div>
      </form>
    </div>
  )
}
