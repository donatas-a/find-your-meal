import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

// True when the JWT's "exp" time has passed (or the token can't be read).
function isExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return !payload.exp || payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

function storedToken() {
  const token = localStorage.getItem('token')
  if (token && isExpired(token)) {
    localStorage.removeItem('token')
    return null
  }
  return token
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(storedToken)

  const login = (newToken) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, isAdmin: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
