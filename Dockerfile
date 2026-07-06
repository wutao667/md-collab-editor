# ---- Build stage: Client ----
FROM node:20-alpine AS build-client
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine
RUN apk add --no-cache git curl

WORKDIR /app

# Copy server dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy server code
COPY server/ ./server/

# Copy built client
COPY --from=build-client /app/client/dist ./client/dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server/index.js"]
