FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm turbo run build --filter=@erdify/web...

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
