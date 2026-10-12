# Build the app once, then serve the static files.
#
# The container used to run Vite's dev server, which serves every dependency
# unbundled: 149 files and 24 MB per page load (16.8 MB of it every Phosphor
# icon in every weight), about 3 s each. Signing in through Hydra loads the
# app twice and signing out once, so that was most of the wait. The build is
# one minified, tree-shaken bundle. `npm run dev` outside Docker still
# reloads live.

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Where the browser reaches Kong. Vite writes VITE_* into the bundle at build
# time, so changing it means rebuilding the image (compose passes it as a
# build argument).
ARG VITE_API_BASE_URL=http://localhost:8080/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# Rules the server enforces, so forms can state them (src/config.js).
ARG VITE_PASSWORD_MIN_LENGTH=8
ARG VITE_ADMIN_PASSWORD_MIN_LENGTH=12
ARG VITE_MAX_UPLOAD_MB=25
ENV VITE_PASSWORD_MIN_LENGTH=$VITE_PASSWORD_MIN_LENGTH \
    VITE_ADMIN_PASSWORD_MIN_LENGTH=$VITE_ADMIN_PASSWORD_MIN_LENGTH \
    VITE_MAX_UPLOAD_MB=$VITE_MAX_UPLOAD_MB
RUN npm run build

# nginx as an unprivileged user; 3000 is kept so every port mapping stays.
FROM nginxinc/nginx-unprivileged:1.29.8-alpine
# The server block is a template (API_ORIGIN, filled at start-up by nginx's
# entrypoint); the security headers are a fixed snippet it includes.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3000
