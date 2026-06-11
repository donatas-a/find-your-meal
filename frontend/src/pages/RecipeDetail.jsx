import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [lang, setLang] = useState('lt')
  const [loading, setLoading] = useState(true)
  const [bodyweight, setBodyweight] = useState(() => localStorage.getItem('bodyweight') || '')

  const handleBodyweightChange = (value) => {
    setBodyweight(value)
    if (value) localStorage.setItem('bodyweight', value)
    else localStorage.removeItem('bodyweight')
  }

  useEffect(() => {
    api.get(`/recipes/${id}`)
      .then(r => setRecipe(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading">Loading…</div>
  if (!recipe) return null

  const ingredients = lang === 'en' ? recipe.ingredients : recipe.ingredients_lt
  const steps = lang === 'en' ? recipe.steps : recipe.steps_lt

  return (
    <div className="recipe-detail">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      {recipe.photo ? (
        <img src={recipe.photo} alt={recipe.title} className="recipe-hero" />
      ) : (
        <div className="recipe-hero-placeholder">🍽️</div>
      )}

      <div className="recipe-detail-header">
        <div>
          <h1 className="recipe-detail-title">
            {lang === 'en' ? recipe.title : recipe.title_lt}
          </h1>
          <div className="recipe-detail-title-lt">
            {lang === 'en' ? recipe.title_lt : recipe.title}
          </div>
        </div>
        <div className="lang-toggle">
          <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
          <button className={`lang-btn ${lang === 'lt' ? 'active' : ''}`} onClick={() => setLang('lt')}>LT</button>
        </div>
      </div>

      {(recipe.calories != null || recipe.protein_g != null) && (
        <div className="recipe-section">
          <h2>{lang === 'en' ? 'Nutrition (per serving)' : 'Maistinė vertė (1 porcijai)'}</h2>
          <div className="nutrition-facts">
            {recipe.calories != null && (
              <div className="nutrition-fact">
                <span className="nutrition-value">{recipe.calories}</span>
                <span className="nutrition-label">kcal</span>
              </div>
            )}
            {recipe.protein_g != null && (
              <div className="nutrition-fact">
                <span className="nutrition-value">{recipe.protein_g}g</span>
                <span className="nutrition-label">{lang === 'en' ? 'protein' : 'baltymai'}</span>
              </div>
            )}
            {recipe.serving_weight_g != null && (
              <div className="nutrition-fact">
                <span className="nutrition-value">{recipe.serving_weight_g}g</span>
                <span className="nutrition-label">{lang === 'en' ? 'serving' : 'porcija'}</span>
              </div>
            )}
          </div>

          {recipe.protein_g != null && (
            <div className="bodyweight-calc">
              <label className="form-label">
                {lang === 'en'
                  ? 'Your bodyweight (kg) — calculate servings for your daily protein goal'
                  : 'Jūsų kūno svoris (kg) — apskaičiuokite porcijas dienos baltymų normai'}
              </label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.1"
                value={bodyweight}
                onChange={e => handleBodyweightChange(e.target.value)}
                placeholder={lang === 'en' ? 'e.g. 75' : 'pvz. 75'}
                style={{ maxWidth: '160px' }}
              />
              {bodyweight > 0 && (() => {
                const targetProtein = bodyweight * 1.8
                const servings = targetProtein / recipe.protein_g
                const totalCalories = recipe.calories != null ? Math.round(servings * recipe.calories) : null
                return (
                  <p className="bodyweight-result">
                    {lang === 'en' ? (
                      <>Daily protein target: <strong>{targetProtein.toFixed(0)}g</strong>. To reach it from this meal alone, eat about <strong>{servings.toFixed(1)} servings</strong>{totalCalories != null && <> (~<strong>{totalCalories} kcal</strong>)</>}.</>
                    ) : (
                      <>Dienos baltymų norma: <strong>{targetProtein.toFixed(0)}g</strong>. Norint ją pasiekti vien šiuo patiekalu, valgykite apie <strong>{servings.toFixed(1)} porcijos(-ų)</strong>{totalCalories != null && <> (~<strong>{totalCalories} kcal</strong>)</>}.</>
                    )}
                  </p>
                )
              })()}
            </div>
          )}
        </div>
      )}

      <div className="recipe-section">
        <h2>Description</h2>
        <p className="recipe-description">{recipe.description_lt}</p>
      </div>

      <div className="recipe-section">
        <h2>{lang === 'en' ? 'Ingredients' : 'Ingredientai'}</h2>
        <ul className="ingredients-list">
          {ingredients.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>

      <div className="recipe-section">
        <h2>{lang === 'en' ? 'Steps' : 'Žingsniai'}</h2>
        <ol className="steps-list">
          {steps.map((step, i) => (
            <li key={i}>
              <span className="step-num">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
