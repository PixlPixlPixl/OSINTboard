# Frontend image: build the Vite app, then serve the static bundle with nginx.

# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build

# Docker is a standalone deployment: serve the app from the server root.
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
