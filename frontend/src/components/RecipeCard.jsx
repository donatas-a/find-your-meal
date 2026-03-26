import { useNavigate } from 'react-router-dom'

export default function RecipeCard({ recipe }) {
  const navigate = useNavigate()

  return (
    <div className="recipe-card" onClick={() => navigate(`/recipes/${recipe.id}`)}>
      {recipe.photo ? (
        <img src={recipe.photo} alt={recipe.title} className="recipe-card-img" />
      ) : (
        <div className="recipe-card-placeholder">🍽️</div>
      )}
      <div className="recipe-card-body">
        <div className="recipe-card-title">{recipe.title}</div>
        <div className="recipe-card-title-lt">{recipe.title_lt}</div>
      </div>
    </div>
  )
}
