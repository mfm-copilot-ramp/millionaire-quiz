// Cumulative scoring across all sessions of a Game. A player's identity within a
// Game is their normalized nickname (NFKC + trim + lowercase + collapsed
// whitespace), so the same person re-using a nickname across sessions rolls up
// into one ranked row. Pure + dependency-light so it can be unit-tested without
// a database.

import { normalizeText } from "./scoring";

export interface AggregationPlayer {
  nickname: string;
  score: number;
}

export interface AggregationSession {
  players: AggregationPlayer[];
}

export interface CumulativeEntry {
  rank: number;
  key: string; // normalized nickname (identity)
  nickname: string; // display name (first seen, trimmed)
  totalScore: number;
  sessionsPlayed: number;
  bestScore: number;
}

export function aggregateGameLeaderboard(sessions: AggregationSession[]): CumulativeEntry[] {
  const map = new Map<
    string,
    { nickname: string; totalScore: number; sessionsPlayed: number; bestScore: number }
  >();

  for (const session of sessions) {
    for (const p of session.players) {
      const key = normalizeText(p.nickname);
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.totalScore += p.score;
        existing.sessionsPlayed += 1;
        existing.bestScore = Math.max(existing.bestScore, p.score);
      } else {
        map.set(key, {
          nickname: p.nickname.trim() || p.nickname,
          totalScore: p.score,
          sessionsPlayed: 1,
          bestScore: p.score,
        });
      }
    }
  }

  const rows = [...map.entries()].map(([key, v]) => ({ key, ...v }));
  rows.sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      b.bestScore - a.bestScore ||
      a.nickname.localeCompare(b.nickname),
  );

  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}
