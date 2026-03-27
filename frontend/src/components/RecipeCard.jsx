import { useNavigate } from 'react-router-dom'

export default function RecipeCard({ recipe, featured = false }) {
  const navigate = useNavigate()

  return (
    <article
      className={`recipe-card${featured ? ' featured' : ''}`}
      onClick={() => navigate(`/recipes/${recipe.id}`)}
    >
      <div className="recipe-card-img-wrap">
        {recipe.photo ? (
          <img src={recipe.photo} alt={recipe.title} className="recipe-card-img" />
        ) : (
          <div className="recipe-card-placeholder">🍽️</div>
        )}
      </div>
      <div className="recipe-card-body">
        <div className="recipe-card-title">{recipe.title}</div>
        <div className="recipe-card-title-lt">{recipe.title_lt}</div>
      </div>
    </article>
  )
}
