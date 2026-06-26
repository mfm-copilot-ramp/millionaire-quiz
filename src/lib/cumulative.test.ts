import { describe, it, expect } from "vitest";
import { aggregateGameLeaderboard } from "./cumulative";

describe("aggregateGameLeaderboard", () => {
  it("sums a player's score across sessions by normalized nickname", () => {
    const board = aggregateGameLeaderboard([
      { players: [{ nickname: "Alice", score: 1000 }, { nickname: "Bob", score: 500 }] },
      { players: [{ nickname: "alice", score: 800 }, { nickname: "Bob", score: 200 }] },
    ]);
    expect(board).toHaveLength(2);
    expect(board[0]).toMatchObject({ rank: 1, nickname: "Alice", totalScore: 1800, sessionsPlayed: 2 });
    expect(board[1]).toMatchObject({ rank: 2, nickname: "Bob", totalScore: 700, sessionsPlayed: 2 });
  });

  it("treats whitespace/case variants as the same identity", () => {
    const board = aggregateGameLeaderboard([
      { players: [{ nickname: "  Pat  ", score: 100 }] },
      { players: [{ nickname: "pat", score: 250 }] },
    ]);
    expect(board).toHaveLength(1);
    expect(board[0]).toMatchObject({ totalScore: 350, sessionsPlayed: 2, bestScore: 250 });
  });

  it("tracks best single-session score", () => {
    const board = aggregateGameLeaderboard([
      { players: [{ nickname: "Sam", score: 300 }] },
      { players: [{ nickname: "Sam", score: 900 }] },
      { players: [{ nickname: "Sam", score: 600 }] },
    ]);
    expect(board[0].bestScore).toBe(900);
    expect(board[0].totalScore).toBe(1800);
  });

  it("breaks total ties by best score, then name", () => {
    const board = aggregateGameLeaderboard([
      { players: [{ nickname: "Zoe", score: 500 }, { nickname: "Amy", score: 200 }] },
      { players: [{ nickname: "Zoe", score: 500 }, { nickname: "Amy", score: 800 }] },
    ]);
    // Both total 1000; Amy's best (800) beats Zoe's best (500).
    expect(board[0].nickname).toBe("Amy");
    expect(board[1].nickname).toBe("Zoe");
  });

  it("ignores blank nicknames and returns empty for no players", () => {
    expect(aggregateGameLeaderboard([])).toEqual([]);
    expect(aggregateGameLeaderboard([{ players: [{ nickname: "   ", score: 50 }] }])).toEqual([]);
  });
});
