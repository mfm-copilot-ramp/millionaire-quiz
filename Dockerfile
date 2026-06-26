# Container image for the Millionaire Quiz (Next.js + Socket.IO custom server).
# Works on any container host (Render Docker, Azure Container Apps, Fly.io, etc.).
# The app is a persistent Node process with WebSockets — it is NOT serverless.
#
# Provide DATABASE_URL (PostgreSQL) and JWT_SECRET as runtime env vars.
#
# Single stage on purpose: the production runtime needs the Prisma CLI and tsx
# (both dev dependencies) to push the schema and run the custom server, so there
# is little to gain from pruning. NODE_ENV is left unset during install/build so
# dev dependencies (Next compiler, Tailwind, tsx, Prisma CLI) are available; the
# `start` script sets NODE_ENV=production itself via cross-env.

FROM node:20-slim
WORKDIR /app

# OpenSSL is required by Prisma's query engine.
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV PORT=3000
ENV HOST=0.0.0.0

# Copy the source (node_modules / .env are excluded via .dockerignore).
COPY . .

# Target PostgreSQL for production, then install (postinstall runs `prisma
# generate` against the Postgres schema) and build.
RUN node scripts/set-db-provider.mjs postgresql
RUN npm install
RUN npm run build

EXPOSE 3000

# Sync the schema to the database on boot, then start the custom server.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm start"]
