// src/pages/LeaderboardPage.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  calculateUserSeasonScore,
  getFinalPredictedLevel,
  getTotalScore,
} from '../lib/scoring';

export default function LeaderboardPage({ profile, seasonId, leagueId }) {
  const [season, setSeason] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState(null);

  useEffect(() => {
    if (seasonId) fetchLeaderboard();
  }, [seasonId, leagueId]);

  async function fetchLeaderboard() {
    const { data: seasonData } = await supabase
      .from('seasons')
      .select('*, sports(name)')
      .eq('id', seasonId)
      .single();

    const { data: finishLevels } = await supabase
      .from('finish_levels')
      .select('*')
      .eq('sport_id', seasonData.sport_id);

    const { data: results } = await supabase
      .from('results')
      .select('*')
      .eq('season_id', seasonId);

    // Get all picks for this season
    let picksQuery = supabase
      .from('picks')
      .select('*, profiles(username, display_name)')
      .eq('season_id', seasonId)
      .eq('is_latest', true);

    // If league leaderboard, filter to league members
    if (leagueId) {
      const { data: members } = await supabase
        .from('league_members')
        .select('user_id')
        .eq('league_id', leagueId);

      const memberIds = members.map(m => m.user_id);
      picksQuery = picksQuery.in('user_id', memberIds);

      const { data: leagueData } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();
      setLeague(leagueData);
    }

    const { data: allPicks } = await picksQuery;

    setSeason(seasonData);

    // Group picks by user
    const picksByUser = {};
    (allPicks || []).forEach(pick => {
      if (!picksByUser[pick.user_id]) {
        picksByUser[pick.user_id] = {
          userId: pick.user_id,
          username: pick.profiles.username,
          displayName: pick.profiles.display_name,
          picks: [],
        };
      }
      picksByUser[pick.user_id].picks.push(pick);
    });

    // Score each user
    const scored = Object.values(picksByUser).map(user => {
      const scoredTeams = calculateUserSeasonScore(user.picks, results || [], finishLevels || []);
      const total = getTotalScore(scoredTeams);
      return {
        ...user,
        scoredTeams,
        total: Math.round(total * 100) / 100,
      };
    });

    // Sort by total score descending
    scored.sort((a, b) => b.total - a.total);

    setLeaderboard(scored);
    setLoading(false);
  }

  if (loading) return <div className="loading">Loading leaderboard...</div>;
  if (!season) return <div className="error">Season not found.</div>;

  const resultsEntered = leaderboard.some(u => u.scoredTeams.length > 0);

  return (
    <div className="page leaderboard-page">
      <div className="page-header">
        <h2>
          {league ? `${league.name} — ` : 'Global — '}
          {season.sports.name} {season.name}
        </h2>
        <p className="subtitle">
          {resultsEntered ? 'Live scores based on entered results' : 'Results not yet entered — scores will appear here once the season completes'}
        </p>
      </div>

      {leaderboard.length === 0 && (
        <div className="empty-state">
          <p>No picks submitted yet for this season.</p>
        </div>
      )}

      <div className="leaderboard-table-wrapper">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Total Score</th>
              <th>Teams Picked</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((user, i) => (
              <tr
                key={user.userId}
                className={user.userId === profile.id ? 'is-me' : ''}
              >
                <td className="rank">
                  {i === 0 && '🥇'}
                  {i === 1 && '🥈'}
                  {i === 2 && '🥉'}
                  {i > 2 && `#${i + 1}`}
                </td>
                <td className="player-name">
                  {user.displayName || user.username}
                  {user.userId === profile.id && <span className="you-badge"> (you)</span>}
                </td>
                <td className="total-score">
                  {resultsEntered ? user.total.toLocaleString() : '—'}
                </td>
                <td className="teams-picked">{user.picks.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resultsEntered && leaderboard.length > 0 && (
        <div className="my-breakdown">
          <h3>Your Picks Breakdown</h3>
          {(() => {
            const me = leaderboard.find(u => u.userId === profile.id);
            if (!me) return <p>You haven't submitted picks for this season.</p>;
            return (
              <table className="breakdown-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Your Pick</th>
                    <th>Actual Finish</th>
                    <th>Deviation</th>
                    <th>Multiplier</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {me.scoredTeams.map(t => (
                    <tr key={t.teamId} className={t.deviation === 0 ? 'exact' : ''}>
                      <td>{t.teamId}</td>
                      <td>{t.finalPredictedLevel}</td>
                      <td>{t.actualLevel}</td>
                      <td>{t.deviation}</td>
                      <td>×{t.multiplier}</td>
                      <td className={t.finalScore > 0 ? 'positive' : 'negative'}>
                        {t.finalScore.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}><strong>Total</strong></td>
                    <td><strong>{me.total.toLocaleString()}</strong></td>
                  </tr>
                </tfoot>
              </table>
            );
          })()}
        </div>
      )}
    </div>
  );
}
