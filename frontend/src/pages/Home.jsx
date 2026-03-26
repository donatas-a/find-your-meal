import { useState, useEffect } from 'react'
import api from '../api/client'
import RecipeCard from '../components/RecipeCard'

export default function Home() {
  const [recipes, setRecipes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/recipes/').then(r => setRecipes(r.data)).finally(() => setLoading(false))
  }, [])

  const filtered = recipes.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.title_lt.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="loading">Loading recipes…</div>

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Recipes</h1>
        <input
          className="search-bar"
          type="text"
          placeholder="Search recipes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="recipe-grid">
        {filtered.length === 0 ? (
          <div className="empty-state">
            {search ? 'No recipes match your search.' : 'No recipes yet.'}
          </div>
        ) : (
          filtered.map(r => <RecipeCard key={r.id} recipe={r} />)
        )}
      </div>
    </div>
  )
}
