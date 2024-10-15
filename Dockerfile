FROM node:20-slim AS builder

ARG BACKEND_BASE_URL=""

LABEL org.opencontainers.image.source=https://github.com/JulianFP/project-W-frontend
LABEL org.opencontainers.image.description="Project-W frontend production image"
LABEL org.opencontainers.image.licenses=AGPL-3.0-only

WORKDIR /app

COPY . .

RUN npm install -g pnpm

RUN pnpm install

RUN VITE_BACKEND_BASE_URL=$BACKEND_BASE_URL pnpm build

#to make container small
FROM nginx:alpine-slim

ENV NGINX_CONFIG "ssl"

COPY --from=builder /app/dist /usr/share/nginx/html

COPY Docker/ /NginxConfigs

#for HEALTHCHECK
RUN apk --no-cache add curl

#-s: soft link, -f: force overwrite if file already exists, -T: make sure link is also a file
CMD ln -sfT /NginxConfigs/nginx_${NGINX_CONFIG}.conf /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"

#-k needed for self-signed certificates
HEALTHCHECK CMD curl -kf https://localhost/ || exit 1
