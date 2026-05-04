FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@erdify/landing...

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/landing/dist /usr/share/nginx/html
COPY apps/landing/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
