FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@erdify/api...
RUN pnpm --filter @erdify/api deploy --prod /deploy

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /deploy .
COPY apps/api/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 4000
ENTRYPOINT ["/entrypoint.sh"]
