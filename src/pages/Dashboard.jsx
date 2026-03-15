// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SPORT_EMOJI = { nba: '🏀', nfl: '🏈', nhl: '🏒', mlb: '⚾' };

export default function Dashboard({ profile, navigate }) {
  const [seasons, setSeasons] = useState([]);
  const [myLeagues, setMyLeagues] = useState([]);
  const [recentScores, setRecentScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [seasonsRes, leaguesRes] = await Promise.all([
      supabase
        .from('seasons')
        .select('*, sports(name)')
        .in('status', ['upcoming', 'regular_season', 'playoffs'])
        .order('playoff_deadline', { ascending: true }),
      supabase
        .from('league_members')
        .select('leagues(id, name, invite_code)')
        .eq('user_id', profile.id),
    ]);

    setSeasons(seasonsRes.data || []);
    setMyLeagues(leaguesRes.data?.map(m => m.leagues) || []);
    setLoading(false);
  }

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page dashboard">
      <div className="page-header">
        <h2>Welcome back, <span className="highlight">{profile.display_name || profile.username}</span></h2>
        <p className="subtitle">Your picks dashboard</p>
      </div>

      <section className="dashboard-section">
        <h3>Active Seasons</h3>
        {seasons.length === 0 && <p className="empty">No active seasons right now.</p>}
        <div className="card-grid">
          {seasons.map(season => {
            const now = new Date();
            const rsDeadline = new Date(season.regular_season_deadline);
            const poDeadline = new Date(season.playoff_deadline);
            const isOpen = now < poDeadline;
            const deadlineLabel = now < rsDeadline
              ? `Regular season picks close ${rsDeadline.toLocaleDateString()}`
              : now < poDeadline
              ? `Playoff picks close ${poDeadline.toLocaleDateString()}`
              : 'Submissions closed';

            return (
              <div key={season.id} className="season-card card">
                <div className="card-sport">
                  {SPORT_EMOJI[season.sport_id]} {season.sports.name}
                </div>
                <h4>{season.name}</h4>
                <p className={`deadline-label ${isOpen ? 'open' : 'closed'}`}>
                  {deadlineLabel}
                </p>
                <div className="card-actions">
                  <button
                    className="btn-primary"
                    onClick={() => navigate('picks', { seasonId: season.id })}
                  >
                    {isOpen ? 'Submit Picks' : 'View Picks'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => navigate('leaderboard', { seasonId: season.id })}
                  >
                    Leaderboard
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <h3>My Leagues</h3>
          <button className="btn-outline" onClick={() => navigate('league', { view: 'browse' })}>
            + Create / Join League
          </button>
        </div>
        {myLeagues.length === 0 && (
          <div className="empty-state">
            <p>You're not in any leagues yet.</p>
            <button className="btn-primary" onClick={() => navigate('league', { view: 'browse' })}>
              Create or Join a League
            </button>
          </div>
        )}
        <div className="card-grid">
          {myLeagues.map(league => (
            <div key={league.id} className="league-card card">
              <h4>{league.name}</h4>
              <p className="invite-code">Code: <code>{league.invite_code}</code></p>
              <button
                className="btn-secondary"
                onClick={() => navigate('league', { leagueId: league.id })}
              >
                View League
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
