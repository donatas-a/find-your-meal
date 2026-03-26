import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import RecipeDetail from './pages/RecipeDetail'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import RecipeForm from './pages/RecipeForm'

function PrivateRoute({ children }) {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recipes/:id" element={<RecipeDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/new" element={<PrivateRoute><RecipeForm /></PrivateRoute>} />
        <Route path="/admin/edit/:id" element={<PrivateRoute><RecipeForm /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
