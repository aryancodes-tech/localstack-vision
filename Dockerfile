# TanStack Start → Nitro `node` preset (DOCKER_BUILD=1 in vite.config.ts).
FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN DOCKER_BUILD=1 npm run build

FROM node:24-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV NITRO_HOST=0.0.0.0

COPY --from=builder /app/.output ./.output

USER node
EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]
