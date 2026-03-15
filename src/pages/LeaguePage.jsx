// src/pages/LeaguePage.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LeaguePage({ profile, navigate, view, leagueId }) {
  const [activeView, setActiveView] = useState(leagueId ? 'detail' : (view || 'browse'));
  const [myLeagues, setMyLeagues] = useState([]);
  const [league, setLeague] = useState(null);
  const [members, setMembers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueDesc, setNewLeagueDesc] = useState('');

  // Join form
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  useEffect(() => {
    if (leagueId) fetchLeagueDetail();
    else fetchMyLeagues();
  }, [leagueId]);

  async function fetchMyLeagues() {
    const { data } = await supabase
      .from('league_members')
      .select('leagues(id, name, description, invite_code, owner_id)')
      .eq('user_id', profile.id);
    setMyLeagues(data?.map(m => m.leagues) || []);
    setLoading(false);
  }

  async function fetchLeagueDetail() {
    const { data: leagueData } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single();

    const { data: membersData } = await supabase
      .from('league_members')
      .select('profiles(id, username, display_name)')
      .eq('league_id', leagueId);

    const { data: seasonsData } = await supabase
      .from('seasons')
      .select('*, sports(name)')
      .in('status', ['upcoming', 'regular_season', 'playoffs', 'complete'])
      .order('playoff_deadline', { ascending: false })
      .limit(5);

    setLeague(leagueData);
    setMembers(membersData?.map(m => m.profiles) || []);
    setSeasons(seasonsData || []);
    setLoading(false);
  }

  async function handleCreateLeague(e) {
    e.preventDefault();
    const { data, error } = await supabase
      .from('leagues')
      .insert({ name: newLeagueName, description: newLeagueDesc, owner_id: profile.id })
      .select()
      .single();

    if (!error && data) {
      // Auto-join the creator
      await supabase.from('league_members').insert({
        league_id: data.id,
        user_id: profile.id,
      });
      navigate('league', { leagueId: data.id });
    }
  }

  async function handleJoinLeague(e) {
    e.preventDefault();
    setJoinError('');
    setJoinSuccess('');

    const { data: leagueData, error } = await supabase
      .from('leagues')
      .select('id, name')
      .eq('invite_code', joinCode.trim())
      .single();

    if (error || !leagueData) {
      setJoinError('Invalid invite code. Double-check and try again.');
      return;
    }

    const { error: joinError } = await supabase
      .from('league_members')
      .insert({ league_id: leagueData.id, user_id: profile.id });

    if (joinError) {
      setJoinError('You might already be in this league.');
    } else {
      setJoinSuccess(`Joined "${leagueData.name}"!`);
      setTimeout(() => navigate('league', { leagueId: leagueData.id }), 1500);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;

  // Detail view for a specific league
  if (activeView === 'detail' && league) {
    const isOwner = league.owner_id === profile.id;
    return (
      <div className="page league-page">
        <div className="page-header">
          <h2>{league.name}</h2>
          {league.description && <p className="subtitle">{league.description}</p>}
          <div className="invite-section">
            <span>Invite code: </span>
            <code className="invite-code-display">{league.invite_code}</code>
            <button
              className="btn-outline btn-small"
              onClick={() => navigator.clipboard.writeText(league.invite_code)}
            >
              Copy
            </button>
          </div>
        </div>

        <div className="league-detail-grid">
          <div className="league-members-panel">
            <h3>Members ({members.length})</h3>
            <ul className="members-list">
              {members.map(m => (
                <li key={m.id} className={m.id === profile.id ? 'is-me' : ''}>
                  {m.display_name || m.username}
                  {m.id === league.owner_id && <span className="owner-badge"> 👑</span>}
                  {m.id === profile.id && <span className="you-badge"> (you)</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="league-seasons-panel">
            <h3>Leaderboards</h3>
            {seasons.map(season => (
              <div key={season.id} className="season-row">
                <span>{season.sports.name} — {season.name}</span>
                <button
                  className="btn-secondary btn-small"
                  onClick={() => navigate('leaderboard', { seasonId: season.id, leagueId: league.id })}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Browse view — list my leagues + create/join
  return (
    <div className="page league-page">
      <div className="page-header">
        <h2>Leagues</h2>
      </div>

      <div className="league-actions-grid">
        <div className="card form-card">
          <h3>Create a League</h3>
          <form onSubmit={handleCreateLeague}>
            <div className="form-group">
              <label>League Name</label>
              <input
                value={newLeagueName}
                onChange={e => setNewLeagueName(e.target.value)}
                placeholder="e.g. Office Picks 2025"
                required
              />
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <input
                value={newLeagueDesc}
                onChange={e => setNewLeagueDesc(e.target.value)}
                placeholder="A short description"
              />
            </div>
            <button type="submit" className="btn-primary">Create League</button>
          </form>
        </div>

        <div className="card form-card">
          <h3>Join a League</h3>
          <form onSubmit={handleJoinLeague}>
            <div className="form-group">
              <label>Invite Code</label>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="8-character code"
                required
              />
            </div>
            {joinError && <div className="auth-error">{joinError}</div>}
            {joinSuccess && <div className="auth-message">{joinSuccess}</div>}
            <button type="submit" className="btn-primary">Join League</button>
          </form>
        </div>
      </div>

      <section className="dashboard-section">
        <h3>My Leagues</h3>
        {myLeagues.length === 0 && <p className="empty">You haven't joined any leagues yet.</p>}
        <div className="card-grid">
          {myLeagues.map(l => (
            <div key={l.id} className="league-card card">
              <h4>{l.name}</h4>
              {l.description && <p>{l.description}</p>}
              <p className="invite-code">Code: <code>{l.invite_code}</code></p>
              <button
                className="btn-secondary"
                onClick={() => { setLeague(null); navigate('league', { leagueId: l.id }); }}
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
