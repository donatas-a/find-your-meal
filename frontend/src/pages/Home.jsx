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

  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Mūsų receptai.</h1>
        <div className="search-wrap">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            className="search-bar"
            type="text"
            placeholder="Search for recipes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </section>

      {loading ? (
        <div className="loading">Loading recipes…</div>
      ) : (
        <div className="recipe-grid">
          {filtered.length === 0 ? (
            <div className="empty-state">
              {search ? 'No recipes match your search.' : 'No recipes yet.'}
            </div>
          ) : (
            filtered.map((r, i) => (
              <RecipeCard key={r.id} recipe={r} featured={i % 5 === 1} />
            ))
          )}
        </div>
      )}
    </>
  )
}
