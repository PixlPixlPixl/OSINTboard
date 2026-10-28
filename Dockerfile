# Frontend image: build the Vite app, then serve the static bundle with nginx.
#
# @serverfire/shared-auth is a file: dependency that lives outside this repo
# (../serverfire-infra/shared-auth for `npm install`). A Docker build cannot
# reach outside its context, so docker-compose.yml passes that directory as an
# additional build context named "shared-auth".

# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build

# Docker is a standalone deployment: serve the app from the server root.
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}

# Reproduce the sibling layout expected by the file: dependency:
#   /build/OSINTboard + /build/serverfire-infra/shared-auth
WORKDIR /build
COPY --from=shared-auth . /build/serverfire-infra/shared-auth
COPY . /build/OSINTboard

WORKDIR /build/OSINTboard
# `npm ci` links the file: dependency but does not install its own deps, so
# shared-auth gets its own install (pocketbase).
RUN npm ci --no-audit --no-fund \
    && npm --prefix /build/serverfire-infra/shared-auth ci --no-audit --no-fund \
    && npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/OSINTboard/dist /usr/share/nginx/html

EXPOSE 80
