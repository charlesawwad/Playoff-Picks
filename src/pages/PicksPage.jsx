// src/pages/PicksPage.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getActiveDeadlineType } from '../lib/scoring';

export default function PicksPage({ session, profile, seasonId }) {
  const [season, setSeason] = useState(null);
  const [teams, setTeams] = useState([]);
  const [finishLevels, setFinishLevels] = useState([]);
  const [picks, setPicks] = useState({}); // { teamId: finishLevel }
  const [existingPicks, setExistingPicks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deadlineType, setDeadlineType] = useState(null);

  useEffect(() => {
    if (seasonId) fetchAll();
  }, [seasonId]);

  async function fetchAll() {
    const { data: seasonData } = await supabase
      .from('seasons')
      .select('*, sports(name)')
      .eq('id', seasonId)
      .single();

    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .eq('sport_id', seasonData.sport_id)
      .eq('active', true)
      .order('name');

    const { data: levelsData } = await supabase
      .from('finish_levels')
      .select('*')
      .eq('sport_id', seasonData.sport_id)
      .order('level', { ascending: false });

    const { data: picksData } = await supabase
      .from('picks')
      .select('*')
      .eq('user_id', profile.id)
      .eq('season_id', seasonId)
      .eq('is_latest', true);

    setSeason(seasonData);
    setTeams(teamsData || []);
    setFinishLevels(levelsData || []);
    setExistingPicks(picksData || []);

    const dt = getActiveDeadlineType(seasonData);
    setDeadlineType(dt);

    // Pre-populate picks from existing data for this deadline
    const pickMap = {};
    (picksData || []).forEach(p => {
      if (p.deadline_type === dt) {
        pickMap[p.team_id] = p.predicted_finish_level;
      }
    });
    setPicks(pickMap);
    setLoading(false);
  }

  function handlePickChange(teamId, level) {
    setPicks(prev => ({ ...prev, [teamId]: level === '' ? undefined : parseInt(level) }));
  }

  // Which level is assigned to this team?
  // Each team can only appear once per deadline
  function getTeamPick(teamId) {
    return picks[teamId] ?? '';
  }

  async function handleSave() {
    if (!deadlineType) return;
    setSaving(true);
    setSaved(false);

    // Mark old picks for this deadline as not latest
    await supabase
      .from('picks')
      .update({ is_latest: false })
      .eq('user_id', profile.id)
      .eq('season_id', seasonId)
      .eq('deadline_type', deadlineType);

    // Insert new picks
    const newPicks = Object.entries(picks)
      .filter(([_, level]) => level !== undefined)
      .map(([teamId, level]) => ({
        user_id: profile.id,
        season_id: seasonId,
        team_id: teamId,
        predicted_finish_level: level,
        deadline_type: deadlineType,
        is_latest: true,
        submitted_at: new Date().toISOString(),
      }));

    if (newPicks.length > 0) {
      await supabase.from('picks').upsert(newPicks, {
        onConflict: 'user_id,season_id,team_id,deadline_type',
      });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <div className="loading">Loading picks...</div>;
  if (!season) return <div className="error">Season not found.</div>;

  const isOpen = deadlineType !== null;

  // Group teams by how many picks already assigned (for UX feedback)
  const assignedCount = Object.values(picks).filter(v => v !== undefined).length;

  return (
    <div className="page picks-page">
      <div className="page-header">
        <h2>{season.sports.name} — {season.name}</h2>
        <p className="subtitle">
          {isOpen
            ? `Submit your ${deadlineType === 'regular_season' ? 'regular season' : 'playoff'} picks`
            : 'Submissions are closed for this season'}
        </p>
        {isOpen && (
          <div className="deadline-info">
            <span className="badge open">Picks Open</span>
            <span>
              {deadlineType === 'regular_season'
                ? `Regular season deadline: ${new Date(season.regular_season_deadline).toLocaleString()}`
                : `Playoff deadline: ${new Date(season.playoff_deadline).toLocaleString()}`}
            </span>
          </div>
        )}
      </div>

      <div className="picks-instructions">
        <p>Assign a predicted finish to any team. Each team can only appear once. Leave blank to skip a team.</p>
        <p><strong>{assignedCount}</strong> team{assignedCount !== 1 ? 's' : ''} assigned so far.</p>
      </div>

      <div className="picks-table-wrapper">
        <table className="picks-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Predicted Finish</th>
              {!isOpen && <th>Your Previous Pick</th>}
            </tr>
          </thead>
          <tbody>
            {teams.map(team => (
              <tr key={team.id} className={picks[team.id] ? 'has-pick' : ''}>
                <td className="team-name">{team.name}</td>
                <td>
                  {isOpen ? (
                    <select
                      value={getTeamPick(team.id)}
                      onChange={e => handlePickChange(team.id, e.target.value)}
                      className="pick-select"
                    >
                      <option value="">— No pick —</option>
                      {finishLevels.map(level => (
                        <option key={level.level} value={level.level}>
                          {level.label} (×{level.multiplier})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="pick-readonly">
                      {finishLevels.find(l => l.level === picks[team.id])?.label || '—'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <div className="picks-footer">
          <button
            className="btn-primary btn-large"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Picks'}
          </button>
          {saved && <span className="save-success">✓ Picks saved!</span>}
          <p className="save-note">You can update your picks any time before the deadline. Only your latest submission counts.</p>
        </div>
      )}

      <div className="finish-levels-legend">
        <h4>Finish Levels & Multipliers</h4>
        <div className="levels-grid">
          {[...finishLevels].sort((a, b) => b.level - a.level).map(level => (
            <div key={level.level} className="level-item">
              <span className="level-label">{level.label}</span>
              <span className="level-multiplier">×{level.multiplier}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
