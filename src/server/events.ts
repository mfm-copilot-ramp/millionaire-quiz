// Realtime event protocol + view models shared by the Socket.IO server
// (src/server/*) and the React client (imported via @/server/events). Types
// only — no runtime/node dependencies — so it is safe to import from both the
// tsx server process and the browser bundle.

import type { QuestionType, SubmittedAnswer } from "../lib/quiz-types";

export type GamePhase = "lobby" | "question" | "reveal" | "gameover";

export interface PublicOption {
  id: string;
  text: string;
}

export interface PlayerView {
  id: string;
  nickname: string;
  connected: boolean;
  score: number;
}

export interface QuestionView {
  index: number; // 0-based position in the set
  total: number;
  type: QuestionType;
  title: string;
  timeLimitSeconds: number;
  /** Empty for SHORT_TEXT / NUMERIC (free-entry) questions. */
  options: PublicOption[];
  /** True for MULTIPLE_SELECT (player may pick more than one). */
  allowMultiple: boolean;
  /** True for POLL (no correct answer, no points). */
  isPoll: boolean;
}

export interface RevealOption extends PublicOption {
  isCorrect: boolean;
  count: number; // how many players chose it
}

export interface RevealView {
  index: number;
  total: number;
  type: QuestionType;
  title: string;
  options: RevealOption[];
  acceptedAnswers: string[] | null; // SHORT_TEXT
  numericAnswer: number | null; // NUMERIC
  numericTolerance: number | null; // NUMERIC
  totalAnswers: number;
  playerCount: number;
  isPoll: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  score: number;
  lastPoints: number; // points earned on the most recent question
}

export interface YouQuestion {
  answered: boolean;
  answer: SubmittedAnswer | null;
}

export interface YouReveal {
  answered: boolean;
  isCorrect: boolean;
  pointsEarned: number;
  totalScore: number;
  rank: number;
}

export type GameStateView =
  | {
      phase: "lobby";
      joinCode: string;
      gameTitle: string;
      total: number;
      players: PlayerView[];
    }
  | {
      phase: "question";
      joinCode: string;
      gameTitle: string;
      question: QuestionView;
      deadline: number; // epoch ms when answers lock
      serverNow: number; // server clock at send time (for offset correction)
      answeredCount: number;
      playerCount: number;
      you: YouQuestion | null; // null for the host
    }
  | {
      phase: "reveal";
      joinCode: string;
      gameTitle: string;
      reveal: RevealView;
      leaderboard: LeaderboardEntry[];
      you: YouReveal | null; // null for the host
    }
  | {
      phase: "gameover";
      joinCode: string;
      gameTitle: string;
      leaderboard: LeaderboardEntry[];
      you: { rank: number; score: number } | null;
    };

// ---------- client -> server payloads ----------

export interface HostJoinPayload {
  token: string;
}

export interface PlayerJoinPayload {
  sessionId: string;
  playerId: string;
}

export interface PlayerAnswerPayload {
  answer: SubmittedAnswer;
}

export interface AnswerAck {
  accepted: boolean;
  reason?: string;
}

export interface SocketError {
  message: string;
}

// Event name constants keep the server and client in lockstep.
export const EVENTS = {
  // server -> client
  STATE: "state",
  TIMER: "timer",
  ANSWER_ACK: "answer:ack",
  ERROR: "error",
  // client -> server (host)
  HOST_JOIN: "host:join",
  HOST_START: "host:start",
  HOST_NEXT: "host:next",
  HOST_REVEAL: "host:reveal",
  HOST_END: "host:end",
  // client -> server (player)
  PLAYER_JOIN: "player:join",
  PLAYER_ANSWER: "player:answer",
} as const;

export interface TimerTick {
  remainingMs: number;
}
