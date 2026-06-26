// Player identity cookie. Players don't have accounts — when they join a session
// we drop an httpOnly cookie so the play page can recognize them on reload and
// the realtime layer can reconnect them to their Player row. Next.js-only.

import { cookies } from "next/headers";

const PLAYER_COOKIE = "mq_player";
const PLAYER_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export interface PlayerIdentity {
  sessionId: string;
  playerId: string;
  nickname: string;
}

export async function setPlayerCookie(identity: PlayerIdentity): Promise<void> {
  const store = await cookies();
  store.set(PLAYER_COOKIE, JSON.stringify(identity), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PLAYER_TTL_SECONDS,
  });
}

export async function getPlayerIdentity(): Promise<PlayerIdentity | null> {
  const store = await cookies();
  const raw = store.get(PLAYER_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.sessionId === "string" && typeof parsed.playerId === "string") {
      return {
        sessionId: parsed.sessionId,
        playerId: parsed.playerId,
        nickname: typeof parsed.nickname === "string" ? parsed.nickname : "",
      };
    }
  } catch {
    // fall through
  }
  return null;
}

export async function clearPlayerCookie(): Promise<void> {
  const store = await cookies();
  store.delete(PLAYER_COOKIE);
}
