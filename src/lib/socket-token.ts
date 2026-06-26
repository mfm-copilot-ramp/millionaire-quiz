// Short-lived token that authorizes a host's realtime (Socket.IO) connection for
// one specific session. The host page (a server component that already ran
// requireUser) mints this and passes it to the client; the socket server
// verifies it before honoring any host:* control event. Signed with the same
// JWT_SECRET as the auth cookie but a distinct shape/TTL, so the long-lived
// httpOnly session cookie is never exposed to client JavaScript.
//
// jose is isomorphic, and this module imports nothing Next-specific, so the tsx
// socket server can import it with a relative path.

import { SignJWT, jwtVerify } from "jose";

const TTL_SECONDS = 60 * 60 * 6; // 6 hours — comfortably longer than a session

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET is missing or too short.");
  }
  return new TextEncoder().encode(secret);
}

export interface SocketTokenPayload {
  sub: string; // host user id
  sessionId: string;
  role: "host";
}

export async function signSocketToken(payload: SocketTokenPayload): Promise<string> {
  return new SignJWT({ sessionId: payload.sessionId, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySocketToken(token: string): Promise<SocketTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || payload.role !== "host" || typeof payload.sessionId !== "string") {
      return null;
    }
    return { sub: String(payload.sub), sessionId: payload.sessionId, role: "host" };
  } catch {
    return null;
  }
}
