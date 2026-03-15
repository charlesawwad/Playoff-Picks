// src/pages/AdminPage.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SPORTS = ['nba', 'nfl', 'nhl', 'mlb'];

export default function AdminPage({ profile }) {
  const [tab, setTab] = useState('results');
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [teams, setTeams] = useState([]);
  const [finishLevels, setFinishLevels] = useState([]);
  const [results, setResults] = useState({}); // { teamId: level }
  const [savedResults, setSavedResults] = useState({});
  const [saving, setSaving] = useState(false);

  // Season creation
  const [newSeason, setNewSeason] = useState({
    sport_id: 'nba', name: '', regular_season_deadline: '', playoff_deadline: '', status: 'upcoming'
  });

  // Team creation
  const [newTeam, setNewTeam] = useState({ sport_id: 'nba', name: '', abbreviation: '' });
  const [allTeams, setAllTeams] = useState([]);

  useEffect(() => {
    fetchSeasons();
    fetchAllTeams();
  }, []);

  useEffect(() => {
    if (selectedSeason) fetchSeasonData();
  }, [selectedSeason]);

  async function fetchSeasons() {
    const { data } = await supabase
      .from('seasons')
      .select('*, sports(name)')
      .order('playoff_deadline', { ascending: false });
    setSeasons(data || []);
  }

  async function fetchAllTeams() {
    const { data } = await supabase.from('teams').select('*').order('sport_id').order('name');
    setAllTeams(data || []);
  }

  async function fetchSeasonData() {
    const season = seasons.find(s => s.id === selectedSeason);
    if (!season) return;

    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .eq('sport_id', season.sport_id)
      .order('name');

    const { data: levelsData } = await supabase
      .from('finish_levels')
      .select('*')
      .eq('sport_id', season.sport_id)
      .order('level', { ascending: false });

    const { data: existingResults } = await supabase
      .from('results')
      .select('*')
      .eq('season_id', selectedSeason);

    setTeams(teamsData || []);
    setFinishLevels(levelsData || []);

    const resultMap = {};
    (existingResults || []).forEach(r => {
      resultMap[r.team_id] = r.actual_finish_level;
    });
    setResults(resultMap);
    setSavedResults(resultMap);
  }

  async function saveResults() {
    setSaving(true);
    const toUpsert = Object.entries(results)
      .filter(([_, level]) => level !== undefined && level !== '')
      .map(([teamId, level]) => ({
        season_id: selectedSeason,
        team_id: teamId,
        actual_finish_level: parseInt(level),
        entered_by: profile.id,
        entered_at: new Date().toISOString(),
      }));

    await supabase.from('results').upsert(toUpsert, { onConflict: 'season_id,team_id' });
    setSavedResults({ ...results });
    setSaving(false);
    alert('Results saved!');
  }

  async function createSeason(e) {
    e.preventDefault();
    const { error } = await supabase.from('seasons').insert(newSeason);
    if (!error) {
      alert('Season created!');
      fetchSeasons();
      setNewSeason({ sport_id: 'nba', name: '', regular_season_deadline: '', playoff_deadline: '', status: 'upcoming' });
    } else {
      alert('Error: ' + error.message);
    }
  }

  async function createTeam(e) {
    e.preventDefault();
    const { error } = await supabase.from('teams').insert(newTeam);
    if (!error) {
      alert('Team added!');
      fetchAllTeams();
      setNewTeam({ sport_id: 'nba', name: '', abbreviation: '' });
    } else {
      alert('Error: ' + error.message);
    }
  }

  async function updateSeasonStatus(seasonId, status) {
    await supabase.from('seasons').update({ status }).eq('id', seasonId);
    fetchSeasons();
  }

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h2>⚙️ Admin Panel</h2>
        <p className="subtitle">Manage seasons, teams, and results</p>
      </div>

      <div className="admin-tabs">
        {['results', 'seasons', 'teams'].map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* RESULTS TAB */}
      {tab === 'results' && (
        <div className="admin-section">
          <h3>Enter Playoff Results</h3>
          <div className="form-group">
            <label>Select Season</label>
            <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)}>
              <option value="">— Choose a season —</option>
              {seasons.map(s => (
                <option key={s.id} value={s.id}>{s.sports.name} — {s.name}</option>
              ))}
            </select>
          </div>

          {selectedSeason && (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Actual Finish</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map(team => (
                    <tr key={team.id}>
                      <td>{team.name}</td>
                      <td>
                        <select
                          value={results[team.id] ?? ''}
                          onChange={e => setResults(prev => ({ ...prev, [team.id]: e.target.value }))}
                        >
                          <option value="">— Not entered —</option>
                          {finishLevels.map(level => (
                            <option key={level.level} value={level.level}>{level.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {savedResults[team.id] ? '✓ Saved' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn-primary" onClick={saveResults} disabled={saving}>
                {saving ? 'Saving...' : 'Save All Results'}
              </button>
            </>
          )}
        </div>
      )}

      {/* SEASONS TAB */}
      {tab === 'seasons' && (
        <div className="admin-section">
          <h3>Create New Season</h3>
          <form onSubmit={createSeason} className="admin-form">
            <div className="form-group">
              <label>Sport</label>
              <select value={newSeason.sport_id} onChange={e => setNewSeason(p => ({ ...p, sport_id: e.target.value }))}>
                {SPORTS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Season Name</label>
              <input value={newSeason.name} onChange={e => setNewSeason(p => ({ ...p, name: e.target.value }))} placeholder="e.g. 2024-25 NBA Season" required />
            </div>
            <div className="form-group">
              <label>Regular Season Deadline</label>
              <input type="datetime-local" value={newSeason.regular_season_deadline} onChange={e => setNewSeason(p => ({ ...p, regular_season_deadline: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Playoff Deadline</label>
              <input type="datetime-local" value={newSeason.playoff_deadline} onChange={e => setNewSeason(p => ({ ...p, playoff_deadline: e.target.value }))} required />
            </div>
            <button type="submit" className="btn-primary">Create Season</button>
          </form>

          <h3>Manage Seasons</h3>
          <table className="admin-table">
            <thead>
              <tr><th>Season</th><th>Status</th><th>Update Status</th></tr>
            </thead>
            <tbody>
              {seasons.map(s => (
                <tr key={s.id}>
                  <td>{s.sports.name} — {s.name}</td>
                  <td><span className={`status-badge ${s.status}`}>{s.status}</span></td>
                  <td>
                    <select
                      value={s.status}
                      onChange={e => updateSeasonStatus(s.id, e.target.value)}
                    >
                      {['upcoming', 'regular_season', 'playoffs', 'complete'].map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TEAMS TAB */}
      {tab === 'teams' && (
        <div className="admin-section">
          <h3>Add Team</h3>
          <form onSubmit={createTeam} className="admin-form">
            <div className="form-group">
              <label>Sport</label>
              <select value={newTeam.sport_id} onChange={e => setNewTeam(p => ({ ...p, sport_id: e.target.value }))}>
                {SPORTS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Team Name</label>
              <input value={newTeam.name} onChange={e => setNewTeam(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Los Angeles Lakers" required />
            </div>
            <div className="form-group">
              <label>Abbreviation</label>
              <input value={newTeam.abbreviation} onChange={e => setNewTeam(p => ({ ...p, abbreviation: e.target.value }))} placeholder="e.g. LAL" required />
            </div>
            <button type="submit" className="btn-primary">Add Team</button>
          </form>

          <h3>All Teams</h3>
          <table className="admin-table">
            <thead><tr><th>Sport</th><th>Name</th><th>Abbr</th></tr></thead>
            <tbody>
              {allTeams.map(t => (
                <tr key={t.id}>
                  <td>{t.sport_id.toUpperCase()}</td>
                  <td>{t.name}</td>
                  <td>{t.abbreviation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
