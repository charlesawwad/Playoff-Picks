// src/components/Navbar.jsx
import { supabase } from '../lib/supabase';

export default function Navbar({ profile, navigate, currentPage }) {
  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('dashboard')}>
        🏆 <span>Playoff Picks</span>
      </div>

      <div className="navbar-links">
        <button
          className={currentPage === 'dashboard' ? 'active' : ''}
          onClick={() => navigate('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={currentPage === 'league' ? 'active' : ''}
          onClick={() => navigate('league', { view: 'browse' })}
        >
          Leagues
        </button>
        {profile?.is_admin && (
          <button
            className={currentPage === 'admin' ? 'active' : ''}
            onClick={() => navigate('admin')}
          >
            Admin
          </button>
        )}
      </div>

      <div className="navbar-user">
        <span className="username">{profile?.display_name || profile?.username}</span>
        <button className="btn-outline btn-small" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
