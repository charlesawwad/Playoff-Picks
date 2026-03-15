// src/App.jsx
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import PicksPage from './pages/PicksPage';
import LeaguePage from './pages/LeaguePage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import Navbar from './components/Navbar';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [pageParams, setPageParams] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  }

  function navigate(newPage, params = {}) {
    setPage(newPage);
    setPageParams(params);
  }

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!session) return <AuthPage />;

  const commonProps = { session, profile, navigate };

  return (
    <div className="app">
      <Navbar profile={profile} navigate={navigate} currentPage={page} />
      <main className="main-content">
        {page === 'dashboard'    && <Dashboard    {...commonProps} />}
        {page === 'picks'        && <PicksPage    {...commonProps} {...pageParams} />}
        {page === 'league'       && <LeaguePage   {...commonProps} {...pageParams} />}
        {page === 'leaderboard'  && <LeaderboardPage {...commonProps} {...pageParams} />}
        {page === 'admin'        && profile?.is_admin && <AdminPage {...commonProps} />}
      </main>
    </div>
  );
}
