"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { EVENTS, type AnswerAck, type GameStateView, type TimerTick } from "@/server/events";
import type { SubmittedAnswer } from "@/lib/quiz-types";

export type GameIdentity =
  | { role: "host"; token: string }
  | { role: "player"; sessionId: string; playerId: string };

export interface GameSocket {
  state: GameStateView | null;
  remainingMs: number | null;
  error: string | null;
  connected: boolean;
  ack: AnswerAck | null;
  answer: (answer: SubmittedAnswer) => void;
  start: () => void;
  next: () => void;
  reveal: () => void;
  end: () => void;
}

export function useGameSocket(identity: GameIdentity): GameSocket {
  const [state, setState] = useState<GameStateView | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [ack, setAck] = useState<AnswerAck | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const identityKey =
    identity.role === "host" ? `host:${identity.token}` : `player:${identity.sessionId}:${identity.playerId}`;

  useEffect(() => {
    const socket = io({ path: "/socket.io/" });
    socketRef.current = socket;

    const join = () => {
      if (identity.role === "host") {
        socket.emit(EVENTS.HOST_JOIN, { token: identity.token });
      } else {
        socket.emit(EVENTS.PLAYER_JOIN, {
          sessionId: identity.sessionId,
          playerId: identity.playerId,
        });
      }
    };

    socket.on("connect", () => {
      setConnected(true);
      join();
    });
    socket.on("disconnect", () => setConnected(false));

    socket.on(EVENTS.STATE, (next: GameStateView) => {
      setState(next);
      setError(null);
      if (next.phase === "question") {
        setRemainingMs(Math.max(0, next.deadline - next.serverNow));
        setAck(null);
      } else {
        setRemainingMs(null);
      }
    });
    socket.on(EVENTS.TIMER, (tick: TimerTick) => setRemainingMs(tick.remainingMs));
    socket.on(EVENTS.ANSWER_ACK, (a: AnswerAck) => setAck(a));
    socket.on(EVENTS.ERROR, (e: { message: string }) => setError(e.message));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
    // identityKey captures the meaningful identity values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey]);

  const answer = useCallback((value: SubmittedAnswer) => {
    socketRef.current?.emit(EVENTS.PLAYER_ANSWER, { answer: value });
  }, []);
  const start = useCallback(() => socketRef.current?.emit(EVENTS.HOST_START), []);
  const next = useCallback(() => socketRef.current?.emit(EVENTS.HOST_NEXT), []);
  const reveal = useCallback(() => socketRef.current?.emit(EVENTS.HOST_REVEAL), []);
  const end = useCallback(() => socketRef.current?.emit(EVENTS.HOST_END), []);

  return { state, remainingMs, error, connected, ack, answer, start, next, reveal, end };
}
