import { useLocation } from 'react-router-dom'
import './Navbar.css'

export function Navbar({ onNavigate }) {
  const location = useLocation()
  const currentPage = location.pathname === '/constitutional' ? 'constitutional' : 'dashboard'

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>HCA Analysis</h1>
        </div>
        <div className="navbar-tabs">
          <button
            className={`navbar-tab ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate('dashboard')}
          >
            High Court Database
          </button>
          <button
            className={`navbar-tab ${currentPage === 'constitutional' ? 'active' : ''}`}
            onClick={() => onNavigate('constitutional')}
          >
            High Court Constitutional Law
          </button>
        </div>
      </div>
    </nav>
  )
}
