import type { Server as SocketIOServer, Socket } from "socket.io";
import { parseSubmittedAnswer } from "../lib/quiz-types";
import { verifySocketToken } from "../lib/socket-token";
import { GameHub } from "./game-engine";
import {
  EVENTS,
  type HostJoinPayload,
  type PlayerAnswerPayload,
  type PlayerJoinPayload,
} from "./events";

/**
 * Registers all realtime game handlers on the Socket.IO server. A single
 * GameHub owns the authoritative in-memory state for every live session; this
 * layer just validates inbound payloads and routes them to the hub.
 */
export function registerSocketHandlers(io: SocketIOServer): void {
  const hub = new GameHub(io);

  io.on("connection", (socket: Socket) => {
    socket.on(EVENTS.HOST_JOIN, async (payload: HostJoinPayload) => {
      const token = payload?.token;
      if (typeof token !== "string") {
        socket.emit(EVENTS.ERROR, { message: "Missing host token." });
        return;
      }
      const claims = await verifySocketToken(token);
      if (!claims) {
        socket.emit(EVENTS.ERROR, { message: "Your host session expired. Reload the page." });
        return;
      }
      await hub.hostJoin(socket, claims.sessionId);
    });

    socket.on(EVENTS.PLAYER_JOIN, async (payload: PlayerJoinPayload) => {
      const sessionId = payload?.sessionId;
      const playerId = payload?.playerId;
      if (typeof sessionId !== "string" || typeof playerId !== "string") {
        socket.emit(EVENTS.ERROR, { message: "Invalid join request." });
        return;
      }
      await hub.playerJoin(socket, sessionId, playerId);
    });

    socket.on(EVENTS.PLAYER_ANSWER, async (payload: PlayerAnswerPayload) => {
      const answer = parseSubmittedAnswer(payload?.answer);
      if (!answer) {
        socket.emit(EVENTS.ANSWER_ACK, { accepted: false, reason: "Invalid answer." });
        return;
      }
      await hub.playerAnswer(socket, answer);
    });

    socket.on(EVENTS.HOST_START, () => void hub.hostStart(socket));
    socket.on(EVENTS.HOST_NEXT, () => void hub.hostNext(socket));
    socket.on(EVENTS.HOST_REVEAL, () => void hub.hostReveal(socket));
    socket.on(EVENTS.HOST_END, () => void hub.hostEnd(socket));

    socket.on("disconnect", () => {
      hub.handleDisconnect(socket);
    });
  });
}
