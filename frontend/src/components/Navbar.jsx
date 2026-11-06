import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAdminLang } from '../context/AdminLang'

export default function Navbar() {
  const { isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const { lang, setLang, t } = useAdminLang()
  const { pathname } = useLocation()
  const showLang = isAdmin || pathname === '/login'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Find Your Meal</Link>
      <div className="navbar-actions">
        {showLang && (
          <div className="lang-toggle" style={{ marginTop: 0 }}>
            <button type="button" className={`lang-btn${lang === 'lt' ? ' active' : ''}`} onClick={() => setLang('lt')}>LT</button>
            <button type="button" className={`lang-btn${lang === 'en' ? ' active' : ''}`} onClick={() => setLang('en')}>EN</button>
          </div>
        )}
        {isAdmin && (
          <>
            <Link to="/admin" className="navbar-link">{t('admin')}</Link>
            <button onClick={handleLogout} className="btn btn-outline btn-sm">{t('logout')}</button>
          </>
        )}
      </div>
    </nav>
  )
}
