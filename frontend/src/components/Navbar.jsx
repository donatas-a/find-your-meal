import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Find Your Meal</Link>
      <div className="navbar-actions">
        {isAdmin && (
          <>
            <Link to="/admin" className="navbar-link">Admin</Link>
            <button onClick={handleLogout} className="btn btn-outline btn-sm">Log out</button>
          </>
        )}
      </div>
    </nav>
  )
}
