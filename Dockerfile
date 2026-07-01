# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------------------
# deps: install full dependency tree once, shared by dev/build stages
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---------------------------------------------------------------------------
# dev: hot-reloading container used by docker-compose for local development
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS dev
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ---------------------------------------------------------------------------
# build: compiles TypeScript and generates the Prisma client for production
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# ---------------------------------------------------------------------------
# production: minimal runtime image, non-root user, only prod artifacts
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS production
WORKDIR /app
RUN apk add --no-cache openssl \
  && addgroup -S atlas && adduser -S atlas -G atlas

ENV NODE_ENV=production

COPY --from=build --chown=atlas:atlas /app/node_modules ./node_modules
COPY --from=build --chown=atlas:atlas /app/dist ./dist
COPY --from=build --chown=atlas:atlas /app/prisma ./prisma
COPY --from=build --chown=atlas:atlas /app/package.json ./package.json

USER atlas
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]
