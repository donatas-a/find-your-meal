import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [lang, setLang] = useState('en')
  const [loading, setLoading] = useState(true)

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
