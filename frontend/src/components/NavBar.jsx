import { NavLink } from 'react-router-dom';
import './NavBar.css';

export default function NavBar() {
  return (
    <nav className="navbar container">
      <NavLink 
        to="/" 
        className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
      >
        <span className="nav-link__icon">📝</span>
        Review Queue
      </NavLink>
      <NavLink 
        to="/dashboard" 
        className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
      >
        <span className="nav-link__icon">📊</span>
        Dashboard
      </NavLink>
    </nav>
  );
}
