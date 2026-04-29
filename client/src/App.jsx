import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [page, setPage] = useState('login')
  const [user, setUser]   = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token  = localStorage.getItem('token')
    if (stored && token) {
      setUser(JSON.parse(stored))
      setPage('dashboard')
    }
  }, [])

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    setPage('dashboard')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setPage('login')
  }

  if (page === 'dashboard' && user) {
    return <Dashboard user={user} onLogout={handleLogout} />
  }
  if (page === 'register') {
    return <Register onLogin={handleLogin} onBack={() => setPage('login')} />
  }
  return <Login onLogin={handleLogin} onRegister={() => setPage('register')} />
}
