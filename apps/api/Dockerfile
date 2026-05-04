FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@erdify/api...
RUN pnpm --filter @erdify/api deploy --prod /deploy --legacy

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /deploy .
COPY apps/api/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:4000/health || exit 1
ENTRYPOINT ["/entrypoint.sh"]
