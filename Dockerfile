# Single stage on purpose: the entrypoint runs the SQL migrations with tsx, and
# `next start` needs the build output, so the image keeps the full node_modules.
FROM node:22-slim
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# No NEXT_PUBLIC_* variables and no secrets are needed to build: everything is
# read at runtime from --env-file .env (never baked into the image).
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
