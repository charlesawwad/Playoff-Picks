// ============================================================
// scoring.js — Playoff Picks Scoring Engine
// ============================================================

/**
 * Calculate the score for a single team prediction.
 *
 * Rules:
 * - Base: 50 points if exact, minus 10 per level of deviation
 * - Multiplied by the multiplier of the LOWER of (predicted, actual) finish level
 * - If predicted level is an average (between two deadlines), the multiplier
 *   is interpolated between the two adjacent levels' multipliers
 *
 * @param {number} predictedLevel   - Final predicted finish level (may be decimal if averaged)
 * @param {number} actualLevel      - Actual finish level (integer)
 * @param {Array}  finishLevels     - Array of { level, multiplier } for this sport
 * @returns {object}                - { deviation, basePoints, multiplier, finalScore }
 */
export function calculateTeamScore(predictedLevel, actualLevel, finishLevels) {
  const deviation = Math.abs(predictedLevel - actualLevel);
  const basePoints = 50 - deviation * 10;

  // The multiplier is based on the LOWER of the two levels
  const lowerLevel = Math.min(predictedLevel, actualLevel);

  const multiplier = getMultiplierForLevel(lowerLevel, finishLevels);
  const finalScore = basePoints * multiplier;

  return {
    deviation,
    basePoints,
    multiplier,
    finalScore: Math.round(finalScore * 100) / 100,
  };
}

/**
 * Get the multiplier for a given level (handles decimal levels by interpolating).
 */
function getMultiplierForLevel(level, finishLevels) {
  const sorted = [...finishLevels].sort((a, b) => a.level - b.level);

  // Exact match
  const exact = sorted.find((f) => f.level === level);
  if (exact) return exact.multiplier;

  // Interpolate between two adjacent levels (e.g. level = 2.5)
  const lower = sorted.filter((f) => f.level < level).pop();
  const upper = sorted.find((f) => f.level > level);

  if (!lower) return upper.multiplier;
  if (!upper) return lower.multiplier;

  // Average the two adjacent multipliers
  return (lower.multiplier + upper.multiplier) / 2;
}

/**
 * Calculate the final predicted level for a team.
 * If the team has picks at both deadlines, the final predicted level
 * is the average of the two.
 *
 * @param {object|null} regularSeasonPick  - Pick submitted before regular season deadline
 * @param {object|null} playoffPick        - Pick submitted before playoff deadline
 * @returns {number}                       - Final predicted level (may be decimal)
 */
export function getFinalPredictedLevel(regularSeasonPick, playoffPick) {
  if (regularSeasonPick && playoffPick) {
    return (regularSeasonPick.predicted_finish_level + playoffPick.predicted_finish_level) / 2;
  }
  if (playoffPick) return playoffPick.predicted_finish_level;
  if (regularSeasonPick) return regularSeasonPick.predicted_finish_level;
  return null;
}

/**
 * Calculate all scores for a user in a season.
 *
 * @param {Array}  userPicks     - All picks for this user in this season
 *                                 Each: { team_id, predicted_finish_level, deadline_type }
 * @param {Array}  results       - All results for this season
 *                                 Each: { team_id, actual_finish_level }
 * @param {Array}  finishLevels  - Finish levels for this sport
 * @returns {Array}              - Array of scored team objects
 */
export function calculateUserSeasonScore(userPicks, results, finishLevels) {
  const resultMap = {};
  results.forEach((r) => {
    resultMap[r.team_id] = r.actual_finish_level;
  });

  // Group picks by team, then by deadline
  const picksByTeam = {};
  userPicks.forEach((pick) => {
    if (!picksByTeam[pick.team_id]) {
      picksByTeam[pick.team_id] = { regular_season: null, playoff: null };
    }
    picksByTeam[pick.team_id][pick.deadline_type] = pick;
  });

  const scoredTeams = [];

  Object.entries(picksByTeam).forEach(([teamId, teamPicks]) => {
    const actualLevel = resultMap[teamId];
    if (actualLevel === undefined) return; // Result not entered yet

    const finalPredictedLevel = getFinalPredictedLevel(
      teamPicks.regular_season,
      teamPicks.playoff
    );

    if (finalPredictedLevel === null) return;

    const { deviation, basePoints, multiplier, finalScore } = calculateTeamScore(
      finalPredictedLevel,
      actualLevel,
      finishLevels
    );

    scoredTeams.push({
      teamId,
      finalPredictedLevel,
      actualLevel,
      deviation,
      basePoints,
      multiplier,
      finalScore,
    });
  });

  return scoredTeams;
}

/**
 * Sum up all team scores for a user.
 */
export function getTotalScore(scoredTeams) {
  return scoredTeams.reduce((sum, t) => sum + t.finalScore, 0);
}

// ============================================================
// DEADLINE HELPERS
// ============================================================

/**
 * Determine which deadline is currently active for submissions.
 * Returns 'regular_season', 'playoff', or null (submissions closed).
 */
export function getActiveDeadlineType(season) {
  const now = new Date();
  const rsDeadline = new Date(season.regular_season_deadline);
  const poDeadline = new Date(season.playoff_deadline);

  if (now < rsDeadline) return 'regular_season';
  if (now < poDeadline) return 'playoff';
  return null; // Both deadlines passed
}

/**
 * Check if submissions are currently open for a season.
 */
export function isSubmissionOpen(season) {
  return getActiveDeadlineType(season) !== null;
}
