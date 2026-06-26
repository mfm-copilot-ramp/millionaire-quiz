import type { Server as SocketIOServer, Socket } from "socket.io";

/**
 * Registers all realtime game handlers on the Socket.IO server.
 * The full host/player event protocol is implemented in the realtime-core phase;
 * this is the single entry point wired up by the custom server (server.ts).
 */
export function registerSocketHandlers(io: SocketIOServer): void {
  io.on("connection", (socket: Socket) => {
    socket.on("disconnect", () => {
      // Realtime cleanup is handled in the realtime-core phase.
    });
  });
}
