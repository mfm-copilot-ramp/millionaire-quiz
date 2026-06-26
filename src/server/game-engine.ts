// Authoritative in-memory game engine for live sessions.
//
// One Room per session holds the loaded questions, scoring config, players, and
// the answers for the current question. The server owns the clock: it starts a
// question, ticks a countdown, locks answers at the deadline (or when everyone
// has answered), scores with the pure scoring engine, persists Responses, and
// broadcasts state. Clients render whatever state they're sent and never decide
// timing or correctness.
//
// Relative imports only — this runs inside the tsx server process (server.ts).

import type { Server as SocketIOServer, Socket } from "socket.io";
import { prisma } from "../lib/db";
import { OPTION_BASED_TYPES, type QuestionType, type SubmittedAnswer } from "../lib/quiz-types";
import { scoreAnswer, type ScoringConfig, type ScoringQuestion } from "../lib/scoring";
import { toScoringConfig } from "../lib/game-config";
import {
  EVENTS,
  type GamePhase,
  type GameStateView,
  type LeaderboardEntry,
  type PlayerView,
  type QuestionView,
  type RevealOption,
  type RevealView,
} from "./events";

interface LoadedOption {
  id: string;
  text: string;
  isCorrect: boolean;
  points: number;
  order: number;
}

interface LoadedQuestion {
  id: string;
  order: number; // 1-based within the set
  type: QuestionType;
  title: string;
  timeLimitSeconds: number;
  basePoints: number;
  options: LoadedOption[];
  acceptedAnswers: string[] | null;
  numericAnswer: number | null;
  numericTolerance: number | null;
}

interface RoomPlayer {
  id: string;
  nickname: string;
  connected: boolean;
  score: number;
  lastPoints: number;
  lastCorrect: boolean;
  socketId: string | null;
}

interface PendingAnswer {
  answer: SubmittedAnswer;
  msToAnswer: number;
}

interface Room {
  sessionId: string;
  gameId: string;
  joinCode: string;
  gameTitle: string;
  status: "LOBBY" | "IN_PROGRESS" | "ENDED";
  phase: GamePhase;
  questions: LoadedQuestion[];
  config: ScoringConfig;
  index: number;
  questionStartedAt: number;
  questionDeadline: number;
  startedAt: Date | null;
  players: Map<string, RoomPlayer>;
  answers: Map<string, PendingAnswer>;
  hostSockets: Set<string>;
  tick: NodeJS.Timeout | null;
  timer: NodeJS.Timeout | null;
}

function roomName(sessionId: string): string {
  return `s:${sessionId}`;
}

function parseAcceptedAnswers(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  } catch {
    // fall through
  }
  return null;
}

export class GameHub {
  private readonly io: SocketIOServer;
  private readonly rooms = new Map<string, Room>();
  private readonly loading = new Map<string, Promise<Room | null>>();

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  // ---------- room loading ----------

  async getRoom(sessionId: string): Promise<Room | null> {
    const cached = this.rooms.get(sessionId);
    if (cached) return cached;

    const inFlight = this.loading.get(sessionId);
    if (inFlight) return inFlight;

    const promise = this.loadRoom(sessionId).finally(() => this.loading.delete(sessionId));
    this.loading.set(sessionId, promise);
    return promise;
  }

  private async loadRoom(sessionId: string): Promise<Room | null> {
    const existing = this.rooms.get(sessionId);
    if (existing) return existing;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        game: {
          include: {
            questionSet: {
              include: {
                questions: {
                  orderBy: { order: "asc" },
                  include: { options: { orderBy: { order: "asc" } } },
                },
              },
            },
          },
        },
        players: { orderBy: { joinedAt: "asc" } },
      },
    });
    if (!session) return null;

    const questions: LoadedQuestion[] = session.game.questionSet.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type as QuestionType,
      title: q.title,
      timeLimitSeconds: q.timeLimitSeconds,
      basePoints: q.basePoints,
      options: q.options.map((o) => ({
        id: o.id,
        text: o.text,
        isCorrect: o.isCorrect,
        points: o.points,
        order: o.order,
      })),
      acceptedAnswers: parseAcceptedAnswers(q.acceptedAnswers),
      numericAnswer: q.numericAnswer,
      numericTolerance: q.numericTolerance,
    }));

    const config = toScoringConfig(
      {
        scoringMode: session.game.scoringMode as ScoringConfig["mode"],
        valueSource: session.game.valueSource as ScoringConfig["valueSource"],
        speedBonus: session.game.speedBonus,
        config: session.game.config,
      },
      questions.length,
    );

    const players = new Map<string, RoomPlayer>();
    for (const p of session.players) {
      players.set(p.id, {
        id: p.id,
        nickname: p.nickname,
        connected: false,
        score: p.score,
        lastPoints: 0,
        lastCorrect: false,
        socketId: null,
      });
    }

    const status = session.status as Room["status"];
    const room: Room = {
      sessionId: session.id,
      gameId: session.gameId,
      joinCode: session.joinCode,
      gameTitle: session.game.title,
      status,
      phase: status === "ENDED" ? "gameover" : "lobby",
      questions,
      config,
      index: status === "ENDED" ? questions.length - 1 : -1,
      questionStartedAt: 0,
      questionDeadline: 0,
      startedAt: session.startedAt,
      players,
      answers: new Map(),
      hostSockets: new Set(),
      tick: null,
      timer: null,
    };

    this.rooms.set(sessionId, room);
    return room;
  }

  // ---------- connection handling ----------

  async hostJoin(socket: Socket, sessionId: string): Promise<void> {
    const room = await this.getRoom(sessionId);
    if (!room) {
      socket.emit(EVENTS.ERROR, { message: "Session not found." });
      return;
    }
    socket.data.role = "host";
    socket.data.sessionId = sessionId;
    room.hostSockets.add(socket.id);
    socket.join(roomName(sessionId));
    socket.emit(EVENTS.STATE, this.buildHostState(room));
  }

  async playerJoin(socket: Socket, sessionId: string, playerId: string): Promise<void> {
    const room = await this.getRoom(sessionId);
    if (!room) {
      socket.emit(EVENTS.ERROR, { message: "Session not found." });
      return;
    }
    const player = room.players.get(playerId);
    if (!player) {
      socket.emit(EVENTS.ERROR, { message: "You're not registered in this game. Re-join with your code." });
      return;
    }

    socket.data.role = "player";
    socket.data.sessionId = sessionId;
    socket.data.playerId = playerId;
    player.connected = true;
    player.socketId = socket.id;
    socket.join(roomName(sessionId));

    socket.emit(EVENTS.STATE, this.buildPlayerState(room, player));
    this.broadcast(room); // refresh lobby rosters / counts for everyone
  }

  handleDisconnect(socket: Socket): void {
    const role = socket.data.role as string | undefined;
    const sessionId = socket.data.sessionId as string | undefined;
    if (!sessionId) return;
    const room = this.rooms.get(sessionId);
    if (!room) return;

    if (role === "host") {
      room.hostSockets.delete(socket.id);
      return;
    }
    if (role === "player") {
      const playerId = socket.data.playerId as string | undefined;
      const player = playerId ? room.players.get(playerId) : undefined;
      if (player && player.socketId === socket.id) {
        player.connected = false;
        player.socketId = null;
        this.broadcast(room);
      }
    }
  }

  // ---------- host controls ----------

  private isHost(socket: Socket, room: Room): boolean {
    return room.hostSockets.has(socket.id);
  }

  async hostNext(socket: Socket): Promise<void> {
    const room = await this.roomForHost(socket);
    if (!room) return;
    switch (room.phase) {
      case "lobby":
        return this.start(room);
      case "question":
        return this.reveal(room);
      case "reveal":
        return this.advance(room);
      default:
        return;
    }
  }

  async hostStart(socket: Socket): Promise<void> {
    const room = await this.roomForHost(socket);
    if (room) this.start(room);
  }

  async hostReveal(socket: Socket): Promise<void> {
    const room = await this.roomForHost(socket);
    if (room) await this.reveal(room);
  }

  async hostEnd(socket: Socket): Promise<void> {
    const room = await this.roomForHost(socket);
    if (room) await this.gameOver(room);
  }

  private async roomForHost(socket: Socket): Promise<Room | null> {
    const sessionId = socket.data.sessionId as string | undefined;
    if (!sessionId) return null;
    const room = await this.getRoom(sessionId);
    if (!room || !this.isHost(socket, room)) {
      socket.emit(EVENTS.ERROR, { message: "Not authorized to control this session." });
      return null;
    }
    return room;
  }

  private start(room: Room): void {
    if (room.phase !== "lobby" || room.questions.length === 0) return;
    room.startedAt = room.startedAt ?? new Date();
    room.status = "IN_PROGRESS";
    this.startQuestion(room, 0);
  }

  private startQuestion(room: Room, index: number): void {
    this.clearTimers(room);
    room.index = index;
    room.phase = "question";
    room.answers.clear();
    for (const p of room.players.values()) {
      p.lastPoints = 0;
      p.lastCorrect = false;
    }

    const q = room.questions[index];
    room.questionStartedAt = Date.now();
    room.questionDeadline = room.questionStartedAt + q.timeLimitSeconds * 1000;

    prisma.session
      .update({
        where: { id: room.sessionId },
        data: {
          status: "IN_PROGRESS",
          currentQuestionIndex: index,
          currentQuestionStartedAt: new Date(room.questionStartedAt),
          startedAt: room.startedAt ?? new Date(),
        },
      })
      .catch(() => {});

    this.broadcast(room);

    room.tick = setInterval(() => {
      const remainingMs = room.questionDeadline - Date.now();
      this.io.to(roomName(room.sessionId)).emit(EVENTS.TIMER, { remainingMs: Math.max(0, remainingMs) });
      if (remainingMs <= 0) {
        void this.reveal(room);
      }
    }, 1000);
    room.timer = setTimeout(() => void this.reveal(room), q.timeLimitSeconds * 1000 + 250);
  }

  private async reveal(room: Room): Promise<void> {
    if (room.phase !== "question") return;
    this.clearTimers(room);
    room.phase = "reveal";

    const q = room.questions[room.index];
    const scoringQuestion = this.toScoringQuestion(q);
    const writes: Promise<unknown>[] = [];

    for (const player of room.players.values()) {
      const pending = room.answers.get(player.id) ?? null;
      const submitted = pending ? pending.answer : null;
      const ms = pending ? pending.msToAnswer : q.timeLimitSeconds * 1000;
      const result = scoreAnswer(scoringQuestion, submitted, ms, room.config);
      player.lastPoints = result.pointsEarned;
      player.lastCorrect = result.isCorrect;

      if (pending) {
        player.score += result.pointsEarned;
        const chosenOptionId =
          submitted && submitted.kind === "options" ? submitted.optionIds[0] ?? null : null;
        writes.push(
          prisma.response.upsert({
            where: {
              sessionId_questionId_playerId: {
                sessionId: room.sessionId,
                questionId: q.id,
                playerId: player.id,
              },
            },
            create: {
              sessionId: room.sessionId,
              questionId: q.id,
              playerId: player.id,
              answer: JSON.stringify(submitted),
              chosenOptionId,
              isCorrect: result.isCorrect,
              msToAnswer: Math.round(ms),
              pointsEarned: result.pointsEarned,
            },
            update: {
              answer: JSON.stringify(submitted),
              chosenOptionId,
              isCorrect: result.isCorrect,
              msToAnswer: Math.round(ms),
              pointsEarned: result.pointsEarned,
            },
          }),
        );
        writes.push(
          prisma.player.update({ where: { id: player.id }, data: { score: player.score } }),
        );
      }
    }

    await Promise.allSettled(writes);
    this.broadcast(room);
  }

  private advance(room: Room): void {
    if (room.phase !== "reveal") return;
    if (room.index + 1 >= room.questions.length) {
      void this.gameOver(room);
      return;
    }
    this.startQuestion(room, room.index + 1);
  }

  private async gameOver(room: Room): Promise<void> {
    this.clearTimers(room);
    room.phase = "gameover";
    room.status = "ENDED";
    await prisma.session
      .update({ where: { id: room.sessionId }, data: { status: "ENDED", endedAt: new Date() } })
      .catch(() => {});
    this.broadcast(room);
  }

  // ---------- player answers ----------

  async playerAnswer(socket: Socket, answer: SubmittedAnswer): Promise<void> {
    const sessionId = socket.data.sessionId as string | undefined;
    const playerId = socket.data.playerId as string | undefined;
    if (!sessionId || !playerId) return;
    const room = this.rooms.get(sessionId);
    if (!room) return;

    if (room.phase !== "question") {
      socket.emit(EVENTS.ANSWER_ACK, { accepted: false, reason: "The question is closed." });
      return;
    }
    if (room.answers.has(playerId)) {
      socket.emit(EVENTS.ANSWER_ACK, { accepted: false, reason: "You already answered." });
      return;
    }
    const ms = Date.now() - room.questionStartedAt;
    if (ms > room.questions[room.index].timeLimitSeconds * 1000 + 500) {
      socket.emit(EVENTS.ANSWER_ACK, { accepted: false, reason: "Time's up." });
      return;
    }

    room.answers.set(playerId, { answer, msToAnswer: Math.max(0, ms) });
    socket.emit(EVENTS.ANSWER_ACK, { accepted: true });
    this.broadcast(room);

    const connected = this.connectedCount(room);
    if (connected > 0 && room.answers.size >= connected) {
      void this.reveal(room);
    }
  }

  // ---------- broadcasting + view models ----------

  private broadcast(room: Room): void {
    for (const player of room.players.values()) {
      if (player.socketId) {
        this.io.to(player.socketId).emit(EVENTS.STATE, this.buildPlayerState(room, player));
      }
    }
    const hostState = this.buildHostState(room);
    for (const sid of room.hostSockets) {
      this.io.to(sid).emit(EVENTS.STATE, hostState);
    }
  }

  private connectedCount(room: Room): number {
    let n = 0;
    for (const p of room.players.values()) if (p.connected) n++;
    return n;
  }

  private playerViews(room: Room): PlayerView[] {
    return [...room.players.values()].map((p) => ({
      id: p.id,
      nickname: p.nickname,
      connected: p.connected,
      score: p.score,
    }));
  }

  private leaderboard(room: Room): LeaderboardEntry[] {
    const sorted = [...room.players.values()].sort(
      (a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname),
    );
    return sorted.map((p, i) => ({
      rank: i + 1,
      playerId: p.id,
      nickname: p.nickname,
      score: p.score,
      lastPoints: p.lastPoints,
    }));
  }

  private publicQuestion(room: Room): QuestionView {
    const q = room.questions[room.index];
    const optionBased = OPTION_BASED_TYPES.includes(q.type);
    return {
      index: room.index,
      total: room.questions.length,
      type: q.type,
      title: q.title,
      timeLimitSeconds: q.timeLimitSeconds,
      options: optionBased ? q.options.map((o) => ({ id: o.id, text: o.text })) : [],
      allowMultiple: q.type === "MULTIPLE_SELECT",
      isPoll: q.type === "POLL",
    };
  }

  private revealView(room: Room): RevealView {
    const q = room.questions[room.index];
    const counts = new Map<string, number>();
    for (const pending of room.answers.values()) {
      if (pending.answer.kind === "options") {
        for (const id of pending.answer.optionIds) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    const options: RevealOption[] = q.options.map((o) => ({
      id: o.id,
      text: o.text,
      isCorrect: o.isCorrect,
      count: counts.get(o.id) ?? 0,
    }));
    return {
      index: room.index,
      total: room.questions.length,
      type: q.type,
      title: q.title,
      options,
      acceptedAnswers: q.acceptedAnswers,
      numericAnswer: q.numericAnswer,
      numericTolerance: q.numericTolerance,
      totalAnswers: room.answers.size,
      playerCount: room.players.size,
      isPoll: q.type === "POLL",
    };
  }

  private buildHostState(room: Room): GameStateView {
    switch (room.phase) {
      case "lobby":
        return {
          phase: "lobby",
          joinCode: room.joinCode,
          gameTitle: room.gameTitle,
          total: room.questions.length,
          players: this.playerViews(room),
        };
      case "question":
        return {
          phase: "question",
          joinCode: room.joinCode,
          gameTitle: room.gameTitle,
          question: this.publicQuestion(room),
          deadline: room.questionDeadline,
          serverNow: Date.now(),
          answeredCount: room.answers.size,
          playerCount: this.connectedCount(room),
          you: null,
        };
      case "reveal":
        return {
          phase: "reveal",
          joinCode: room.joinCode,
          gameTitle: room.gameTitle,
          reveal: this.revealView(room),
          leaderboard: this.leaderboard(room),
          you: null,
        };
      case "gameover":
        return {
          phase: "gameover",
          joinCode: room.joinCode,
          gameTitle: room.gameTitle,
          leaderboard: this.leaderboard(room),
          you: null,
        };
    }
  }

  private buildPlayerState(room: Room, player: RoomPlayer): GameStateView {
    switch (room.phase) {
      case "lobby":
        return {
          phase: "lobby",
          joinCode: room.joinCode,
          gameTitle: room.gameTitle,
          total: room.questions.length,
          players: this.playerViews(room),
        };
      case "question": {
        const pending = room.answers.get(player.id) ?? null;
        return {
          phase: "question",
          joinCode: room.joinCode,
          gameTitle: room.gameTitle,
          question: this.publicQuestion(room),
          deadline: room.questionDeadline,
          serverNow: Date.now(),
          answeredCount: room.answers.size,
          playerCount: this.connectedCount(room),
          you: { answered: pending !== null, answer: pending ? pending.answer : null },
        };
      }
      case "reveal": {
        const board = this.leaderboard(room);
        const mine = board.find((e) => e.playerId === player.id);
        return {
          phase: "reveal",
          joinCode: room.joinCode,
          gameTitle: room.gameTitle,
          reveal: this.revealView(room),
          leaderboard: board,
          you: {
            answered: room.answers.has(player.id),
            isCorrect: player.lastCorrect,
            pointsEarned: player.lastPoints,
            totalScore: player.score,
            rank: mine ? mine.rank : board.length,
          },
        };
      }
      case "gameover": {
        const board = this.leaderboard(room);
        const mine = board.find((e) => e.playerId === player.id);
        return {
          phase: "gameover",
          joinCode: room.joinCode,
          gameTitle: room.gameTitle,
          leaderboard: board,
          you: mine ? { rank: mine.rank, score: mine.score } : null,
        };
      }
    }
  }

  // ---------- helpers ----------

  private toScoringQuestion(q: LoadedQuestion): ScoringQuestion {
    return {
      type: q.type,
      order: q.order,
      basePoints: q.basePoints,
      timeLimitSeconds: q.timeLimitSeconds,
      options: q.options.map((o) => ({ id: o.id, isCorrect: o.isCorrect, points: o.points })),
      acceptedAnswers: q.acceptedAnswers,
      numericAnswer: q.numericAnswer,
      numericTolerance: q.numericTolerance,
    };
  }

  private clearTimers(room: Room): void {
    if (room.tick) {
      clearInterval(room.tick);
      room.tick = null;
    }
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }
  }
}
