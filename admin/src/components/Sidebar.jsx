import { NavLink, useNavigate } from 'react-router-dom'
import { ClipboardList, History, Users, LogOut } from 'lucide-react'

export default function Sidebar() {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('loom_admin_token')
    navigate('/login')
  }

  return (
    <nav className="admin-sidebar">
      <div className="sidebar-wordmark">loom admin</div>

      <div className="sidebar-label">Moderation</div>

      <NavLink to="/queue" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
        <ClipboardList size={15} />
        Reports queue
      </NavLink>

      <NavLink to="/reports" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
        <History size={15} />
        All reports
      </NavLink>

      <div className="sidebar-label">Account management</div>

      <NavLink to="/users" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
        <Users size={15} />
        Users
      </NavLink>

      <div className="sidebar-logout">
        <button className="sidebar-nav-item" style={{ width: '100%' }} onClick={logout}>
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </nav>
  )
}
