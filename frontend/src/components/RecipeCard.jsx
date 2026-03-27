import { useNavigate } from 'react-router-dom'

export default function RecipeCard({ recipe, featured = false, lang = 'lt' }) {
  const navigate = useNavigate()
  const title = lang === 'en' ? recipe.title : recipe.title_lt

  return (
    <article
      className={`recipe-card${featured ? ' featured' : ''}`}
      onClick={() => navigate(`/recipes/${recipe.id}`)}
    >
      <div className="recipe-card-img-wrap">
        {recipe.photo ? (
          <img src={recipe.photo} alt={title} className="recipe-card-img" />
        ) : (
          <div className="recipe-card-placeholder">🍽️</div>
        )}
      </div>
      <div className="recipe-card-body">
        <div className="recipe-card-title">{title}</div>
      </div>
    </article>
  )
}
