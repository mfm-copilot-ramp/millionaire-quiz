import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import "dotenv/config";
import { registerSocketHandlers } from "./src/server/socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });

app.prepare().then(() => {
  const handle = app.getRequestHandler();
  const upgradeHandler = app.getUpgradeHandler();

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/socket.io/",
    cors: { origin: process.env.SOCKET_CORS_ORIGIN ?? "*" },
  });

  // Socket.IO attaches its own "upgrade" listener for "/socket.io/" requests.
  // Forward every other upgrade (e.g. Next.js dev HMR) to Next's handler.
  httpServer.on("upgrade", (req, socket, head) => {
    if (req.url && req.url.startsWith("/socket.io/")) {
      return;
    }
    upgradeHandler(req, socket, head);
  });

  registerSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port} (dev=${dev})`);
  });
});
